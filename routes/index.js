const JSE = global.JSE;
const helper = require('sendgrid').mail;
const sg = require('sendgrid')(JSE.credentials.sendgridAPIKey);
const ascii = require('./../modules/ascii.js');
const express = require('express');

const multer  = require('multer');

const upload = multer({ storage: multer.memoryStorage({}) });

const router = express.Router();

/**
 * @name /*
 * @description Node Home Page
 * @memberof module:jseRouter
 * @todo Could tidy this up and give it an enterprise quality facelift
 */
router.get('/', function (req, res) {
	res.send(`<style>a:link, a:visited, a:hover, a:active { color:#41FF00; }</style>
		<div style="margin: 0px; width: 100%; height: 100%; background: #111111; color: #41FF00; font-family: monospace, sans-serif; text-align: center;">
		<br><br><pre>${ascii}</pre><br>
		<a href="https://JSEcoin.com" target="_blank">https://JSEcoin.com</a><br><br>
		${JSE.jseVersion}<br><br>
		<br><a href="https://blockchain.jsecoin.com" target="_blank">Blockchain Explorer</a><br>
		<a href="https://blockchain.jsecoin.com/stats/#/Stats" target="_blank">Stats</a><br>
		<a href="/stats/" target="_blank">JSON</a><br>
		<a href="https://api.jsecoin.com/api/" target="_blank">API</a>
		<br><a href="/peerlist/" target="_blank">Peer List</a><br>
		<a href="https://platform.jsecoin.com" target="_blank">Platform Login</a>
		<div id="tw" style="margin-top: 25px; font-weight: bold;"></div>
		<script>
		var t = 'THE FUTURE OF BLOCKCHAIN, ECOMMERCE AND DIGITAL ADVERTISING';
		var i = 0;
		function typeWriter() {
		  i++;
		  if (i <= t.length) {
		    document.getElementById("tw").innerHTML = t.substring(0,i)+' <span id="blink">|</span>';
		    setTimeout(typeWriter, 50);
		  }
	    if (i % 2 == 0) {
	      document.getElementById("blink").style.color = '#111111';
	    } else {
	      document.getElementById("blink").style.color = '#41FF00';
	    }
	    if (i > t.length) { setTimeout(typeWriter, 500); }
		}
		typeWriter();
		</script>
		</div>

		`);
});

/**
 * @name /stats/*
 * @description Display JSON string of JSE.publicStats
 * @memberof module:jseRouter
 */
router.get('/stats/*', function(req, res) {
	res.header("Access-Control-Allow-Origin", "*");
	res.send(JSON.stringify(JSE.publicStats));
});

/**
 * @name /dailystats/*
 * @description Display JSON string of JSE.dailyPublicStats
 * @memberof module:jseRouter
 */
router.get('/dailystats/*', function(req, res) {
	res.header("Access-Control-Allow-Origin", "*");
	res.send(JSON.stringify(JSE.dailyPublicStats));
});

/**
 * @name /request/*
 * @description Provides JSE.currentBlockString
 * @memberof module:jseRouter
 */
router.post('/request/*', function (req, res) {
	res.header("Access-Control-Allow-Origin", "*");
	res.send(JSE.currentBlockString);
});

/**
 * @name /peerlist/*
 * @description Provides JSE.peerList
 * @memberof module:jseRouter
 */
router.get('/peerlist/*', function (req, res) {
	res.header("Access-Control-Allow-Origin", "*");
	res.send(JSON.stringify(JSE.peerList));
});

/**
 * @name /optout/*
 * @description Network wide optout via the privacy page
 * @memberof module:jseRouter
 */
router.get('/optout/*', function(req, res) {
	JSE.jseDataIO.plusOne('publicStats/totalOptOuts');
	res.header("Access-Control-Allow-Origin", "*");
	res.send('<html><script>localStorage.setItem("optout", 1); document.cookie = "optout=1;domain=.jsecoin.com;path=/;expires=Thu, 18 Dec 2037 12:00:00 UTC;"; alert("You have now opted out of cryptocurrency mining across the entire JSEcoin network");window.location="https://jsecoin.com";</script></html>');
});

/**
 * @name /optin/*
 * @description Opt in to mining network
 * @memberof module:jseRouter
 */
router.get('/optin/:optInAuthKey/*', function(req, res) {
	JSE.jseDataIO.plusOne('publicStats/totalOptIns');
	const optInAuthKey = JSE.jseFunctions.cleanString(req.params.optInAuthKey);
	res.header("Access-Control-Allow-Origin", "*");
	res.send('<html><script>localStorage.setItem("optin", "'+optInAuthKey+'"); document.cookie = "optin='+optInAuthKey+';domain=.jsecoin.com;path=/;expires=Thu, 18 Dec 2037 12:00:00 UTC;"; localStorage.removeItem("optout"); document.cookie = "optout=;domain=.jsecoin.com;path=/;expires=Thu, 01 Jan 1971 00:00:01 UTC;";</script></html>');
});

// backup optin route
router.get('/optin/*', function(req, res) {
	res.header("Access-Control-Allow-Origin", "*");
	res.send('<html><script>localStorage.setItem("optin", 1); document.cookie = "optin=1;domain=.jsecoin.com;path=/;expires=Thu, 18 Dec 2037 12:00:00 UTC;"; localStorage.removeItem("optout"); document.cookie = "optout=;domain=.jsecoin.com;path=/;expires=Thu, 01 Jan 1971 00:00:01 UTC"; alert("You have now opted in to cryptocurrency mining across the entire JSEcoin network");window.location="https://jsecoin.com";</script></html>');
});

/**
 * @name /optclear/*
 * @description Clear opt in preference to reset and test notification etc
 * @memberof module:jseRouter
 */
router.get('/optclear/*', function(req, res) {
	res.header("Access-Control-Allow-Origin", "*");
	res.send('<html><script>localStorage.removeItem("optout"); localStorage.removeItem("optin"); document.cookie = "optout=;domain=.jsecoin.com;path=/;expires=Thu, 01 Jan 1971 00:00:01 UTC;"; document.cookie = "optin=;domain=.jsecoin.com;path=/;expires=Thu, 01 Jan 1971 00:00:01 UTC;"; alert("You have now cleared all client optin data");</script></html>');
});

/**
 * @name /resendwelcome/*
 * @description Resend the welcome email, limited to onece per 30 minutes
 * @memberof module:jseRouter
 */
router.get('/resendwelcome/:uid/:email/', function(req, res) {
	const cleanUID = parseFloat(req.params.uid);
	const email = JSE.jseFunctions.cleanString(req.params.email).toLowerCase();
	JSE.jseDataIO.getEmail(cleanUID,function(goodEmail) {
		if (email === goodEmail) {
			let naughtyIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress || req.ip;
			if (naughtyIP.indexOf(',') > -1) { naughtyIP = naughtyIP.split(',')[0]; }
			if (naughtyIP.indexOf(':') > -1) { naughtyIP = naughtyIP.split(':').slice(-1)[0]; }
			if (JSE.alreadySentWelcomes.indexOf(email) === -1 && JSE.alreadySentWelcomes.indexOf(naughtyIP) === -1) { // check for email and ip address for repeat requests
				JSE.alreadySentWelcomes.push(email);
				JSE.alreadySentWelcomes.push(naughtyIP);
				const tmpUser = {};
				tmpUser.uid = cleanUID;
				tmpUser.email = email;
				JSE.jseDataIO.getVariable('credentials/'+cleanUID+'/confirmCode', function(confirmCode) {
					tmpUser.confirmCode = confirmCode;
					JSE.jseFunctions.sendWelcomeEmail(tmpUser);
				});
				res.send('<html><div style="width: 100%; margin-top:10px; text-align:center;"><img src="https://jsecoin.com/img/logo.png" alt="JSEcoin" /><br><br><br>Email has been resent<br><br><small>Please check the junk folder in case it has been marked by your mail provider as spam</small></div></html>');
			} else {
					console.log('Resend welcome email blocked from '+naughtyIP);
					res.status(400).send('Welcome email already sent. Please check the spam folder and wait 30 minutes before resending. (Error routes/index.js 49)');
			}
		} else {
			res.status(400).send('User ID or Email not recognized (Error routes/index.js 44.)');
		}
	});
});

/**
 * @name /myexports/*
 * @description Return a list of exported coin objects
 * @memberof module:jseRouter
 */
router.post('/myexports/*', function (req, res) {
	if (!req.body.session) { res.status(400).send('{"fail":1,"notification":"Error 696. No Session Variable"}'); return false; }
	const session = req.body.session;
	JSE.jseDataIO.getCredentialsBySession(session,function(goodCredentials) {
		if (goodCredentials !== null) {
			const myExports = [];
			JSE.jseDataIO.getMyExportedCoins(goodCredentials.uid, function(exportedCoins) {
		 		res.send(JSON.stringify(exportedCoins)); // need to check for null value?
			});
	 	} else {
	 		res.status(401).send('{"fail":1,"notification":"Error index.js 64. Session Variable not recognized"}');
	 	}
	 	return false;
	}, function() {
		res.status(401).send('{"fail":1,"notification":"Error index.js 67. Session Variable not recognized"}');
	});
	return false;
});

/**
 * @name /removecoincode/*
 * @description Set coinobject.removed = true which will prevent the user from retrieving the coincode in future. Can be an unused coincode for privacy.
 * @memberof module:jseRouter
 */
router.post('/removecoincode/*', function (req, res) {
	if (!req.body.session) { res.status(400).send('{"fail":1,"notification":"Error 696. No Session Variable"}'); return false; }
	const session = req.body.session;
	JSE.jseDataIO.getCredentialsBySession(session,function(goodCredentials) {
		if (goodCredentials !== null) {
			const coinCode = JSE.jseFunctions.cleanString(req.body.coinCode);
			JSE.jseDataIO.getVariable('exported/'+coinCode, function(eCoin) {
				if (eCoin.uid === goodCredentials.uid) {
					JSE.jseDataIO.setVariable('exported/'+coinCode+'/removed',true);
					res.send('{"success":1,"notification":"Coincode has been removed"}');
				}
			});
	 	} else {
	 		res.status(401).send('{"fail":1,"notification":"Error index.js 64. Session Variable not recognized"}');
	 	}
	 	return false;
	}, function() {
		res.status(401).send('{"fail":1,"notification":"Error index.js 67. Session Variable not recognized"}');
	});
	return false;
});

/**
 * @name /updateapilevel/*
 * @description Update the users API level to either 0 - Disabled, 1 - Read Access, 2 - Write Access
 * @memberof module:jseRouter
 */
router.post('/updateapilevel/*', function (req, res) {
	if (!req.body.session) { res.status(400).send('{"fail":1,"notification":"Error indedx.js 72. No Session Variable"}'); return false; }
	const session = req.body.session;
	JSE.jseDataIO.getCredentialsBySession(session,function(goodCredentials) {
		const pin = String(req.body.pin).split(/[^0-9]/).join('');
		let pinAttempts = 0;
		JSE.pinAttempts.forEach((el) => { if (el === goodCredentials.uid) pinAttempts +=1; });
		if (pinAttempts > 3) {
			res.status(400).send('{"fail":1,"notification":"Error 231. Account locked three incorrect attempts at pin number, please check again in six hours"}');
			return false;
		} else if (goodCredentials.pin !== pin || pin === null || typeof pin === 'undefined') {
			JSE.pinAttempts.push(goodCredentials.uid);
			res.status(400).send('{"fail":1,"notification":"Error 235. Pin number incorrect or blocked, attempt '+(pinAttempts+1)+'/3"}');
			return false;
		}
		if (goodCredentials !== null) {
			JSE.jseDataIO.setVariable('credentials/'+goodCredentials.uid+'/apiLevel',parseFloat(req.body.newAPILevel));
			res.send('1');
		} else {
	 		res.send('0');
	 	}
	 	return false;
	}, function() {
		res.send('0');
	});
	return false;
});

/**
 * @name /updatedetails/*
 * @description Update the users account details, name and address
 * @memberof module:jseRouter
 */
router.post('/updatedetails/*', function (req, res) {
	if (!req.body.session) { res.status(400).send('{"fail":1,"notification":"Error 717. No Session Variable"}'); return false; }
	const session = req.body.session;
	JSE.jseDataIO.getCredentialsBySession(session,function(goodCredentials) {
		const pin = String(req.body.pin).split(/[^0-9]/).join('');
		let pinAttempts = 0;
		JSE.pinAttempts.forEach((el) => { if (el === goodCredentials.uid) pinAttempts +=1; });
		if (pinAttempts > 3) {
			res.status(400).send('{"fail":1,"notification":"Error 264. Account locked three incorrect attempts at pin number, please check again in six hours"}');
			return false;
		} else if (goodCredentials.pin !== pin || pin === null || typeof pin === 'undefined') {
			JSE.pinAttempts.push(goodCredentials.uid);
			res.status(400).send('{"fail":1,"notification":"Error 268. Pin number incorrect or blocked, attempt '+(pinAttempts+1)+'/3"}');
			return false;
		}
		if (goodCredentials !== null) {
			JSE.jseDataIO.setVariable('account/'+goodCredentials.uid+'/name',JSE.jseFunctions.cleanString(req.body.newName));
			JSE.jseDataIO.setVariable('account/'+goodCredentials.uid+'/address',JSE.jseFunctions.cleanString(req.body.newAddress));
			res.send('1');
		} else {
	 		res.send('0');
	 	}
	 	return false;
	}, function() {
		res.send('0');
	});
	return false;
});

function formatEmail(bodyObjectRaw) {
	const bodyObject = JSON.parse(JSON.stringify(bodyObjectRaw)); // clean object
	let returnString = '';
	Object.keys(bodyObject).forEach(function(key) {
		returnString += String(key).split('\n').join("\n").split('\r').join("\r").split('\t').join('')+': '+String(bodyObject[key]).split('\n').join("\n").split('\t').join('')+"\n\n";
	});
	return String(returnString);
}

function grabReplyEmail(emailContent) {
	const emailSearch = emailContent.match(/(Email: |emailAddress: |emailAddress":")(.*)/);
	let replyEmail = 'noreply@jsecoin.com';
	if (emailSearch && emailSearch[2]) {
		replyEmail = emailSearch[2];
		if (replyEmail.match(/\s/)) replyEmail = replyEmail.split(/\s/)[0];
		if (replyEmail.indexOf('"') > -1) replyEmail = replyEmail.split('"')[0];
	}
	if (!/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(replyEmail)) replyEmail = 'noreply@jsecoin.com';
	return replyEmail;
}

/**
 * @name /adminemail/*
 * @description Send an email to the administrator
 * @memberof module:jseRouter
 */
router.post('/adminemail/*', function (req, res) {
	// Send confirmation email
	let naughtyIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress || req.ip;
	if (naughtyIP.indexOf(',') > -1) { naughtyIP = naughtyIP.split(',')[0]; }
	if (naughtyIP.indexOf(':') > -1) { naughtyIP = naughtyIP.split(':').slice(-1)[0]; }
	if (JSE.alreadySentGeneral.indexOf(naughtyIP) === -1) { // check for email and ip address for repeat requests
		JSE.alreadySentGeneral.push(naughtyIP);
		const fromEmail = new helper.Email('noreply@jsecoin.com');
		const toEmail = new helper.Email(JSE.jseSettings.adminEmail);
		const subject = 'JSE System Email';
		const emailContent = formatEmail(req.body);
		const content = new helper.Content('text/plain', emailContent);
		const mail = new helper.Mail(fromEmail, subject, toEmail, content);
		const replyEmail = grabReplyEmail(emailContent);
		console.log('Contact email sent from: '+replyEmail);
		const replyToHeader = new helper.Email(replyEmail);
		mail.setReplyTo(replyToHeader);
		const request = sg.emptyRequest({ method: 'POST',path: '/v3/mail/send',body: mail.toJSON() });
		sg.API(request, function (error, response) {
		  if (error) { console.log('Sendgrid Error response received, admin email '+JSON.stringify(response)); }
		});
		res.send('{"success":1,"notification":"Email sent"}');
	} else {
		console.log('Admin email blocked from '+naughtyIP);
		res.status(400).send('{"fail":1,"notification":"Error 153. Limited to sending one email per 30 minutes to prevent DoS abuse."}');
	}
});

/**
 * @name /attachmentemail/*
 * @description Send an attachment email with zip file to the administrator
 * @memberof module:jseRouter
 */
router.post('/attachmentemail/*', upload.single('file'), function (req, res) {
	// https://stackoverflow.com/questions/38065118/how-to-attach-files-to-email-using-sendgrid-and-multer
	let naughtyIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress || req.ip;
	if (naughtyIP.indexOf(',') > -1) { naughtyIP = naughtyIP.split(',')[0]; }
	if (naughtyIP.indexOf(':') > -1) { naughtyIP = naughtyIP.split(':').slice(-1)[0]; }
	if (JSE.alreadySentGeneral.indexOf(naughtyIP) === -1) { // check for email and ip address for repeat requests
		JSE.alreadySentGeneral.push(naughtyIP);
		const fromEmail = new helper.Email('noreply@jsecoin.com');
		const toEmail = new helper.Email('team@jsecoin.com');
		const subject = 'JSE Attachment Email';
		const emailContent = formatEmail(req.body);
		const content = new helper.Content('text/plain', emailContent);
		const replyEmail = grabReplyEmail(emailContent);
		console.log('Attachment email sent from: '+replyEmail);
		const replyToHeader = new helper.Email(replyEmail);
		const attachment = new helper.Attachment();
		const fileInfo = req.file;
	  attachment.setFilename(fileInfo.originalname);
	  attachment.setType(fileInfo.mimetype);
	  attachment.setContent(fileInfo.buffer.toString('base64'));
	  attachment.setDisposition('attachment');
		const mail = new helper.Mail(fromEmail, subject, toEmail, content);
		mail.setReplyTo(replyToHeader);
		mail.addAttachment(attachment);
		const request = sg.emptyRequest({ method: 'POST',path: '/v3/mail/send',body: mail.toJSON() });
		sg.API(request, function (error, response) {
		  if (error) { console.log('Sendgrid Error response received: '+JSON.stringify(response)); }
		});
		res.send('{"success":1,"notification":"Email sent"}');
	} else {
		console.log('Attachment email blocked from '+naughtyIP);
		res.status(400).send('{"fail":1,"notification":"Error 186. Limited to sending one email per 30 minutes to prevent DoS abuse."}');
	}
});

/**
 * @name /whitelisting/*
 * @description Apply for ICO whitelisting with photo ID attachment when amount is $10k+
 * @memberof module:jseRouter
 */
router.post('/whitelisting/*', upload.single('file'), function (req, res) {
	let naughtyIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress || req.ip;
	if (naughtyIP.indexOf(',') > -1) { naughtyIP = naughtyIP.split(',')[0]; }
	if (naughtyIP.indexOf(':') > -1) { naughtyIP = naughtyIP.split(':').slice(-1)[0]; }
	let naughtyCount = 0;
	for (let i = 0; i < JSE.alreadySentGeneral.length; i+=1) {
		if (JSE.alreadySentGeneral[i] === naughtyIP) naughtyCount += 1;
	}
	if (naughtyCount < 5) { // check for email and ip address for repeat requests
		JSE.alreadySentGeneral.push(naughtyIP);
		const fromEmail = new helper.Email('noreply@jsecoin.com');
		const toEmail = new helper.Email('dave@jsecoin.com');
		const subject = 'JSE Whitelisting';
		let parsedBody;
		if (!req.file) {
			try {
				parsedBody = JSON.parse(Object.keys(req.body)[0]);
			} catch (e) {
				parsedBody = req.body;
			}
		} else {
			parsedBody = req.body;
		}
		const emailContent = formatEmail(parsedBody);
		const content = new helper.Content('text/plain', emailContent);
		const replyEmail = grabReplyEmail(emailContent);
		console.log('Whitelisting from: '+parsedBody.emailAddress);
		//console.log(JSON.stringify(parsedBody));
		const replyToHeader = new helper.Email(replyEmail);
		const attachment = new helper.Attachment();
		if (req.file) {
			const fileInfo = req.file;
			attachment.setFilename(fileInfo.originalname);
			attachment.setType(fileInfo.mimetype);
			attachment.setContent(fileInfo.buffer.toString('base64'));
			attachment.setDisposition('attachment');
		}
		const mail = new helper.Mail(fromEmail, subject, toEmail, content);
		mail.setReplyTo(replyToHeader);
		if (req.file) {
			mail.addAttachment(attachment);
		}
		const request = sg.emptyRequest({ method: 'POST',path: '/v3/mail/send',body: mail.toJSON() });
		sg.API(request, function (error, response) {
		  if (error) { console.log('Sendgrid Error response received: '+JSON.stringify(response)); }
		});

		if (parsedBody.emailAddress && parsedBody.ethAddress) {
			JSE.jseDataIO.lookupEmail(parsedBody.emailAddress.toLowerCase(),function(uid){
				if (uid === null) {
					res.status(400).send('{"fail":1,"notification":"Error 322. Email address not recognised, please set up an account at https://platform.jsecoin.com"}');
				} else {
					JSE.jseDataIO.setVariable('account/'+uid+'/whitelistAddress',JSE.jseFunctions.cleanString(parsedBody.ethAddress));
					JSE.jseDataIO.setVariable('account/'+uid+'/whitelistAmount',parseFloat(parsedBody.intendedPurchase));
					res.send('{"success":1,"notification":"Whitelisting Form Received"}');
				}
			});
		}
	} else {
		console.log('Whitelisting email blocked from '+naughtyIP);
		res.status(400).send('{"fail":1,"notification":"Error 186. Limited to sending one email per 30 minutes to prevent DoS abuse."}');
	}
});

/**
 * @name /pubstats/*
 * @description Get Public Stats
 * @memberof module:jseRouter
 */
router.post('/pubstats/*', function (req, res) {
	if (!req.body.session) { res.status(400).send('{"fail":1,"notification":"Error 696. No Session Variable"}'); return false; }
	const session = req.body.session;
	JSE.jseDataIO.getCredentialsBySession(session,function(goodCredentials) {
		if (goodCredentials !== null) {
			JSE.jseDataIO.getPubStats(goodCredentials.uid, function(pubStats) { // pubStats.statsDaily pubStats.subIDs pubStats.siteIDs
				JSON.stringify(pubStats);
		 		res.send(JSON.stringify(pubStats)); // need to check for null value?
			});
	 	} else {
	 		res.status(401).send('{"fail":1,"notification":"Error index.js 139. Session Variable not recognized"}');
	 	}
	 	return false;
	}, function() {
		res.status(401).send('{"fail":1,"notification":"Error index.js 142. Session Variable not recognized"}');
	});
	return false;
});

/**
 * @name /logout/*
 * @description Log out of the platform or app by overwriting the session key
 * @memberof module:jseRouter
 */
router.post('/logout/*', function (req, res) {
  if (!req.body.session) { res.status(400).send('{"fail":1,"notification":"No session provided"}'); return false; }
  const session = req.body.session;
  JSE.jseDataIO.getCredentialsBySession(session,function(credentials) {
  	const newCredentials = credentials;
		let previousSessionVar = credentials.session || null;
		newCredentials.session = JSE.jseFunctions.randString(32); // issue new session const on log out, to prevent anything happening afterwards
		if (req.body.app) {
			if (req.body.app === 'desktop') {
				JSE.jseDataIO.setVariable('credentials/'+newCredentials.uid+'/desktopSession', newCredentials.session);
				previousSessionVar = credentials.desktopSession || null;
			} else if (req.body.app === 'web') { // alpha platform
				JSE.jseDataIO.setVariable('credentials/'+newCredentials.uid+'/session', newCredentials.session);
			} else {
				JSE.jseDataIO.setVariable('credentials/'+newCredentials.uid+'/mobileSession', newCredentials.session);
				previousSessionVar = credentials.mobileSession || null;
			}
		} else {
			JSE.jseDataIO.setVariable('credentials/'+newCredentials.uid+'/session', newCredentials.session);
		}
    JSE.jseDataIO.setVariable('lookupSession/'+newCredentials.session,newCredentials.uid);
    if (previousSessionVar) {
      JSE.jseDataIO.hardDeleteVariable('lookupSession/'+previousSessionVar);
    }
    res.send('1');
  },function() {
  	res.send('1');
  });
  return false;
});

/**
 * @name /bountysubmission/*
 * @description Submit Bounty Data
 * @memberof module:jseRouter
 */
router.post('/bountysubmission/*', function (req, res) {
  if (!req.body.session) { res.status(400).send('{"fail":1,"notification":"No session provided"}'); return false; }
	const session = JSE.jseFunctions.cleanString(req.body.session);
  JSE.jseDataIO.getCredentialsBySession(session,function(credentials) {
		const bountySubmission = {};
		bountySubmission.uid = credentials.uid;
		bountySubmission.email = credentials.email;
		bountySubmission.ts = new Date().getTime();
		bountySubmission.status = 1; // 1 pending, 2 = denied, 3 = approved
		bountySubmission.bountyType = JSE.jseFunctions.cleanString(req.body.bountyType);
		bountySubmission.bountyData = {};
		Object.keys(req.body.bountyData).forEach(function(key) {
			bountySubmission.bountyData[key] = JSE.jseFunctions.cleanString(req.body.bountyData[key]);
		});
  	JSE.jseDataIO.pushVariable('bounty/', bountySubmission, function(pushRef) {
			res.send('{"success":1,"notification":"Bounty submission successful","pushRef":"'+pushRef+'"}');
		});
  },function() {
  	res.status(400).send('{"fail":1,"notification":"Error index.js 496. Session Variable not recognized"}'); return false;
  });
  return false;
});

/**
 * @name /setpin/*
 * @description Set a pin number in credentials
 * @memberof module:jseRouter
 */
router.post('/setpin/*', function (req, res) {
	if (!req.body.session) { res.status(400).send('{"fail":1,"notification":"Error 519. No Session Variable"}'); return false; }
	const session = req.body.session;
	JSE.jseDataIO.getCredentialsBySession(session,function(goodCredentials) {
		if (goodCredentials !== null) {
			if (goodCredentials.pin) {
				res.status(400).send('{"fail":1,"notification":"Error index.js 524. Pin number has already been set"}');
			} else {
				const pin = String(req.body.pin).split(/[^0-9]/).join('');
				if (pin.length >= 4 && pin.length <= 12 && pin !== '1234' && pin !== '0000') {
					JSE.jseDataIO.setVariable('credentials/'+goodCredentials.uid+'/pin',pin);
					res.send('{"success":1,"notification":"Pin number has been successfully set.<br><br>Thank you for helping secure your JSEcoin account."}');
				} else {
					res.status(400).send('{"fail":1,"notification":"Error index.js 531. Pin number not secure, must be 4-12 digits"}');
				}
			}
	 	} else {
	 		res.status(401).send('{"fail":1,"notification":"Error index.js 526. Session Variable not recognized"}');
	 	}
	 	return false;
	}, function() {
		res.status(401).send('{"fail":1,"notification":"Error index.js 530. Session Variable not recognized"}');
	});
	return false;
});

/**
 * @name /togglemail/*
 * @description Turn on/off email transaction notifications and/or newsletter
 * @memberof module:jseRouter
 */
router.post('/toggleemail/:type/*', function (req, res) {
	if (!req.body.session) { res.status(400).send('{"fail":1,"notification":"Error 519. No Session Variable"}'); return false; }
	const session = req.body.session;
	const mailType = JSE.jseFunctions.cleanString(req.params.type);
	JSE.jseDataIO.getCredentialsBySession(session,function(goodCredentials) {
		if (goodCredentials !== null) {
			if (mailType === 'newsletter') {
				JSE.jseDataIO.getVariable('account/'+goodCredentials.uid+'/noNewsletter',function(noNewsletter) {
					if (noNewsletter) {
						JSE.jseDataIO.hardDeleteVariable('account/'+goodCredentials.uid+'/noNewsletter');
						res.send('{"success":1,"notification":"You will now receive the newletter","turnedOn":true}');
					} else {
						JSE.jseDataIO.setVariable('account/'+goodCredentials.uid+'/noNewsletter',true);
						res.send('{"success":1,"notification":"You will not receive the newletter","turnedOff":true}');
					}
				});
			} else if (mailType === 'transaction') {
				JSE.jseDataIO.getVariable('account/'+goodCredentials.uid+'/noEmailTransaction',function(noEmailTransaction) {
					if (noEmailTransaction) {
						JSE.jseDataIO.hardDeleteVariable('account/'+goodCredentials.uid+'/noEmailTransaction');
						res.send('{"success":1,"notification":"You will now receive transaction notifications via email","turnedOn":true}');
					} else {
						JSE.jseDataIO.setVariable('account/'+goodCredentials.uid+'/noEmailTransaction',true);
						res.send('{"success":1,"notification":"You will not receive transaction notifications","turnedOff":true}');
					}
				});
			}
	 	} else {
	 		res.status(401).send('{"fail":1,"notification":"Error index.js 573. Session Variable not recognized"}');
	 	}
	 	return false;
	}, function() {
		res.status(401).send('{"fail":1,"notification":"Error index.js 577. Session Variable not recognized"}');
	});
	return false;
});

/**
 * @name /appid/*
 * @description Used to provide a application id to deter command line miners
 * @memberof module:jseRouter
 */
router.get('/appid/:clientid/*', function(req, res) {
	if (JSE.jseFunctions.cleanString(req.params.clientid) === JSE.credentials.clientID) {
		// could add additional checks on the request headers here or hash a seed+datestring to change daily if problem persists.
		res.send(JSE.credentials.appID);
	} else {
		res.status(401).send('{"fail":1,"notification":"Error index.js 618. Client ID not recognized"}');
	}
});

module.exports = router;
