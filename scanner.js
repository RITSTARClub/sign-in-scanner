var CONSOLE_PREFIX = 'STAR Scanner: ',
	MESSAGE_LOADING = 'Loading ID scanner...',
	MESSAGE_READY = '&nwarr; Scan your STAR ID card<br />with the webcam',
	MESSAGE_SCANNED = 'Loading member data...',
	MESSAGE_CAMERA_ACCESS_ERROR = 'ERROR: Could not access cameras',
	MESSAGE_NO_CAMERAS = 'ERROR: No cameras found',
	MESSAGE_API_ERROR = 'ERROR: Could not load member information';

var scanContainer,
	scanPreview,
	scanMessage,
	scanner,
	nameInput,
	namePlaceholder,
	dceInput,
	dcePlaceholder,
	emailInput;
	

function init() {
	initDOM();
	console.log(CONSOLE_PREFIX + 'Finished init\'ing DOM.');
	initScanner();
	console.log(CONSOLE_PREFIX + 'Finished init\'ing scanner.');
	getFormElements();
	console.log(CONSOLE_PREFIX + 'Finished getting form elements.');
}

function initDOM() {
	scanContainer = document.createElement('div');
	scanContainer.id = 'star-scan-container';
	
	scanPreview = document.createElement('video');
	scanPreview.id = 'star-scan-preview';
	
	scanMessage = document.createElement('p');
	scanMessage.id = 'star-scan-message';
	scanMessage.innerHTML = MESSAGE_LOADING;
	
	scanContainer.appendChild(scanPreview);
	scanContainer.appendChild(scanMessage);
	document.body.appendChild(scanContainer);
}

function initScanner() {
	scanner = new Instascan.Scanner({ video: scanPreview });
	scanner.addListener('scan', handleScan);
	
	Instascan.Camera.getCameras().then((cameras) => {
		if (cameras.length > 0) {
			scanner.start(cameras[0]).then(() => {
				scanMessage.innerHTML = MESSAGE_READY;
			});
		} else {
			scanMessage.innerHTML = MESSAGE_NO_CAMERAS;
		}
	}).catch((e) => {
		console.error(CONSOLE_PREFIX + e);
		scanMessage.innerHTML = MESSAGE_CAMERA_ACCESS_ERROR;
	});
}

function getFormElements() {
	var itemTitles = document.getElementsByClassName('freebirdFormviewerViewItemsItemItemTitle');
	itemTitles = Array.prototype.slice.call(itemTitles);
	itemTitles.forEach((title) => {
		var titleText = title.innerText.toLowerCase().replace(/ \*$/, ''); // Strip required question asterisks.
		
		if (titleText === 'name') {
			nameInput = title.parentElement.parentElement.nextElementSibling.getElementsByTagName('input')[0];
		} else if (titleText === 'rit dce') {
			dceInput = title.parentElement.parentElement.nextElementSibling.getElementsByTagName('input')[0];
		} else if (titleText = 'alternate e-mail address') {
			emailInput = title.parentElement.parentElement.nextElementSibling.getElementsByTagName('input')[0];
		}
	});
}

function handleScan(content) {
	console.log(CONSOLE_PREFIX + 'Scanned \u201c' + content + '\u201d.');
	
	var memberId = content.replace('http://ritstar.com/members/', '');
	
	chrome.runtime.sendMessage({ memberId: memberId }, function (response) {
		if (response.status === 200) {
			try {
				populateForm(JSON.parse(response.responseText));
				scanMessage.innerHTML = MESSAGE_READY;
			} catch (e) {
				scanMessage.innerHTML = MESSAGE_API_ERROR;
			}
		} else {
			scanMessage.innerHTML = MESSAGE_API_ERROR;
		}
	});
	scanMessage.innerHTML = MESSAGE_SCANNED;
}

function populateForm(member) {
	if (member.name) {
		nameInput.value = member.name;
		nameInput.parentElement.parentElement.parentElement.parentElement.classList.add('hasValue');
	}
	dceInput.value = member.dce ? member.dce : 'abc1234';
	dceInput.parentElement.parentElement.parentElement.parentElement.classList.add('hasValue');
	if (member.email) {
		emailInput.value = member.email;
		emailInput.parentElement.parentElement.parentElement.parentElement.classList.add('hasValue');
	}
}

init();