const JSE = global.JSE;
const express = require('express');
const authenticator = require('authenticator');
const request = require('request');

const router = express.Router();

/**
 * @function <h3>sendUserData</h3>
 * @memberof module:jseRouter
 * @description Gets the full user data and sends it back to user
 * @param {object} credentials Credentials object
 * @param {string} credentials.uid User ID
 * @param {string} newSessionVar new session variable set on initial login or can be null
 * @param {object} req Express Request object
 * @param {object} res Express Result object
 */
function sendUserData(credentials,newSessionVar,req,res) {
	JSE.jseDataIO.getUserData(credentials, function(userObjectRaw) {
		const userObject = userObjectRaw;
		if (typeof JSE.jseSettings.systemMessage !== 'undefined') {
			userObject.systemMessage = JSE.jseSettings.systemMessage;
		}
		userObject.appReleaseSupport = 50;
		if (newSessionVar) {
			userObject.session = newSessionVar; // set new session key on initial login
		} else if (req.body.app) {
			if (req.body.app === 'desktop' && userObject.desktopSession) {
				userObject.session = userObject.desktopSession; // set user.session to desktopSession, does not overwrite datastore value for credentials/session
			} else if (userObject.mobileSession) {
				userObject.session = userObject.mobileSession;
			}
		}
		if (req.body.jseUnique && req.body.jseUnique !== userObject.jseUnique) {
			const jseUnique = JSE.jseFunctions.cleanString(req.body.jseUnique);
			JSE.jseDataIO.setVariable('account/'+credentials.uid+'/jseUnique',jseUnique);
			userObject.jseUnique = jseUnique;
		}
		res.send(JSON.stringify(userObject)); // sends back full user object
	});
}

/**
 * @function <h3>startLogin</h3>
 * @memberof module:jseRouter
 * @description Sets up a new session and logs last login time and last login IP address for initial logins
 * @param {object} credentials Credentials object
 * @param {object} req Express Request object
 * @param {object} res Express Result object
 */
function startLogin(credentials,req,res) {
	if (credentials.suspended && credentials.suspended !== 0) {
		res.status(400).send('{"fail":1,"notification":"Your account has been suspended pending an investigation, please contact investigations@jsecoin.com"}');
		return false;
	}
	if (req.body.initial) {
		const newSessionCredentials = credentials;
		let previousSessionVar = credentials.session || null;
		const newSessionVar = JSE.jseFunctions.randString(32); // generate a new session key
		if (req.body.app) {
			if (req.body.app === 'desktop') {
				previousSessionVar = credentials.desktopSession || null;
				newSessionCredentials.desktopSession = newSessionVar;
				JSE.jseDataIO.setVariable('credentials/'+newSessionCredentials.uid+'/desktopSession', newSessionCredentials.desktopSession);
			} else if (req.body.app === 'web') { // alpha platform
				newSessionCredentials.session = newSessionVar;
				JSE.jseDataIO.setVariable('credentials/'+newSessionCredentials.uid+'/session', newSessionCredentials.session);
			} else {
				// could send through "mobile" or "ios" "android" etc
				previousSessionVar = credentials.mobileSession || null;
				newSessionCredentials.mobileSession = newSessionVar;
				JSE.jseDataIO.setVariable('credentials/'+newSessionCredentials.uid+'/mobileSession', newSessionCredentials.mobileSession);
			}
		} else {
			newSessionCredentials.session = newSessionVar;
			JSE.jseDataIO.setVariable('credentials/'+newSessionCredentials.uid+'/session', newSessionCredentials.session);
		}
		JSE.jseDataIO.setVariable('lookupSession/'+newSessionVar,newSessionCredentials.uid);
		const newDate = new Date().getTime();
		JSE.jseDataIO.setVariable('account/'+credentials.uid+'/lastLogin',newDate);
		let lastIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress || req.ip;
		if (lastIP.indexOf(',') > -1) { lastIP = lastIP.split(',')[0]; }
		if (lastIP.indexOf(':') > -1) { lastIP = lastIP.split(':').slice(-1)[0]; }
		JSE.jseDataIO.setVariable('account/'+credentials.uid+'/lastip', lastIP);
		if (previousSessionVar) {
			JSE.jseDataIO.hardDeleteVariable('lookupSession/'+previousSessionVar);
		}
		sendUserData(newSessionCredentials,newSessionVar,req,res);
	} else {
		sendUserData(credentials,null,req,res);
	}
	return false;
}

/**
 * @function <h3>passRecaptcha</h3>
 * @memberof module:jseRouter
 * @description Checks Google Recaptcha is valid via a serverside api call
 * @param {object} credentials Credentials object
 * @param {object} req Express Request object
 * @param {object} res Express Result object
 */
function passRecaptcha(credentials,req,res) {
	const secretKey = JSE.credentials.recaptchaSecretKey;
	const verificationUrl = "https://www.google.com/recaptcha/api/siteverify?secret=" + secretKey + "&response=" + req.body['g-recaptcha-response'];
	request(verificationUrl,function(errorRecaptcha,responseRecaptcha,bodyRecaptchaRaw) {
		const bodyRecaptcha = JSON.parse(bodyRecaptchaRaw);
		if (bodyRecaptcha.success && bodyRecaptcha.success === true) {
			startLogin(credentials,req,res);
		} else {
			res.status(400).send('{"fail":1,"notification":"Recaptcha Error login.js 60, Please Try Again"}');
		}
	});
}

/**
 * @name /login/*
 * @description Login end point used for email/pass and user refresh on sessions
 * @memberof module:jseRouter
 */
router.post('/*', function (req, res) {
	if (!req.body.email && !req.body.session) { res.status(400).send('{"fail":1,"notification":"No email or session provided"}'); return false; }
	if (req.body.session) {
		// Log in with session variable
		const session = JSE.jseFunctions.cleanString(String(req.body.session));
		JSE.jseDataIO.getCredentialsBySession(session,function(credentials){
			startLogin(credentials,req,res);
		},function() {
			res.status(401).send('{"fail":1,"notification":"No match for session variable in the database, please try entering your details again"}'); return false;
		});
	} else {
		// Log in with email variable
		const email = JSE.jseFunctions.cleanString(String(req.body.email)).toLowerCase();
		const password = JSE.jseFunctions.limitString(String(req.body.password));
		const passwordHashed = JSE.jseFunctions.sha256(password);
		if (req.body['g-recaptcha-response'] === undefined || req.body['g-recaptcha-response'] === '' || req.body['g-recaptcha-response'] === null) {
			res.status(400).send('{"fail":1,"notification":"Recaptcha Error login.js 88, Please Try Again"}');
		} else {
			JSE.jseDataIO.getCredentialsByPassword(email,passwordHashed,function(credentials){
				if (credentials.twoFactorAuth && !req.body.authCode) {
					res.send('{"msg2fa":"Please enter your two factor authentication code"}');
					return false;
				} else if (credentials.twoFactorAuth && req.body.authCode) {
					if (authenticator.verifyToken(credentials.authKey, JSE.jseFunctions.cleanString(req.body.authCode))) {
						console.log('New 2fa login from '+credentials.email);
						passRecaptcha(credentials,req,res);
					} else {
						res.status(400).send('{"fail":1,"notification":"Failed to pass 2fa authentication, please try again","resetForm":1}');
					}
				} else {
					console.log('New login from '+credentials.email);
					passRecaptcha(credentials,req,res);
				}
				return false;
			},function() {
				res.status(401).send('{"fail":1,"notification":"Login failed. Invalid email or password"}'); return false;
			});
		}
	}
	return false;
});

module.exports = router;
