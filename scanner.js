'use strict';

var CONSOLE_PREFIX = 'STAR Scanner: ',
	MESSAGE_INITING = 'Loading ID scanner...',
	MESSAGE_READY = '&nwarr; Scan your STAR ID card<br />with the webcam.',
	MESSAGE_LOADING = 'Loading member data...',
	MESSAGE_LOADED = 'Loaded member data.<br />Scan again to submit.',
	MESSAGE_CAMERA_ACCESS_ERROR = 'ERROR: Could not access cameras.',
	MESSAGE_NO_CAMERAS = 'ERROR: No cameras found.',
	MESSAGE_API_ERROR = 'ERROR: Could not load member information.',
	DOUBLE_SCAN_WAIT = 1500, /** Minimum time between first and second scan */
	DOUBLE_SCAN_TIMEOUT = 7000, /** Time to wait for a double-scan before resetting */
	FORM_URLS_KEY = 'formURLs';

var initd = false, /** Whether the scanner has been init'd */
	running = false, /** Whether the scanner is currently running */
	scanContainer,
	scanPreview,
	scanMessage,
	scanner,
	nameInput,
	namePlaceholder,
	dceInput,
	dcePlaceholder,
	emailInput,
	lastScanned = '', /** The last scanned ID */
	doubleScanTimer; /** Stores the timeout created with setTimeout */
	

function init() {
	initDOM();
	console.log(CONSOLE_PREFIX + 'Finished init\'ing DOM.');
	initScanner();
	console.log(CONSOLE_PREFIX + 'Finished init\'ing scanner.');
	getFormElements();
	console.log(CONSOLE_PREFIX + 'Finished getting form elements.');
	
	initd = true;
}
function enable() {
	if (running) {
		return;
	}
	if (!initd) {
		init();
	}
	addDOM();
	enableScanner();
	running = true;
	console.log(CONSOLE_PREFIX + 'Enabled.');
}
function disable() {
	if (!running) {
		return;
	}
	removeDOM();
	disableScanner();
	lastScanned = '';
	running = false;
	console.log(CONSOLE_PREFIX + 'Disabled.');
}

function initDOM() {
	scanContainer = document.createElement('div');
	scanContainer.id = 'star-scan-container';
	
	scanPreview = document.createElement('video');
	scanPreview.id = 'star-scan-preview';
	
	scanMessage = document.createElement('p');
	scanMessage.id = 'star-scan-message';
	scanMessage.innerHTML = MESSAGE_INITING;
	
	scanContainer.appendChild(scanPreview);
	scanContainer.appendChild(scanMessage);
}
function addDOM() {
	document.body.appendChild(scanContainer);
}
function removeDOM() {
	document.body.removeChild(scanContainer);
}

function initScanner() {
	scanner = new Instascan.Scanner({
		video: scanPreview,
		backgroundScan: false, // Do not scan when tab is unfocused.
		mirror: false, // Mirroring is handled by our own CSS.
		refractoryPeriod: DOUBLE_SCAN_WAIT // Time in milliseconds before the QR code will be recognized again.
	});
	scanner.addListener('scan', handleScan);
}
function enableScanner() {
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
function disableScanner() {
	scanner.stop();
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
	
	chrome.runtime.sendMessage({ type: 'api', memberId: memberId }, function (response) {
		if (response.status === 200) {
			try {
				if (memberId === lastScanned) {
					// If the ID card was double-scanned, submit the form.
					document.getElementsByTagName('form')[0].submit();
				} else {
					// Otherwise, populate the form with the new member data.
					populateForm(JSON.parse(response.responseText));
					scanMessage.innerHTML = MESSAGE_LOADED;
					lastScanned = memberId;
					doubleScanTimer = setTimeout(() => {
						scanMessage.innerHTML = MESSAGE_READY;
						lastScanned = '';
					}, DOUBLE_SCAN_TIMEOUT);
				}
			} catch (e) {
				scanMessage.innerHTML = MESSAGE_API_ERROR;
			}
		} else {
			scanMessage.innerHTML = MESSAGE_API_ERROR;
		}
	});
	scanMessage.innerHTML = MESSAGE_LOADING;
}

function populateForm(member) {
	if (member.name) {
		nameInput.value = member.name;
		nameInput.parentElement.parentElement.parentElement.parentElement.classList.add('hasValue');
	} else {
		nameInput.value = '';
		nameInput.parentElement.parentElement.parentElement.parentElement.classList.remove('hasValue');
	}
	
	dceInput.value = member.dce ? member.dce : 'abc1234';
	dceInput.parentElement.parentElement.parentElement.parentElement.classList.add('hasValue');
	
	if (member.email) {
		emailInput.value = member.email;
		emailInput.parentElement.parentElement.parentElement.parentElement.classList.add('hasValue');
	} else {
		emailInput.value = '';
		emailInput.parentElement.parentElement.parentElement.parentElement.classList.remove('hasValue');
	}
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
	if (request.type === 'toggle') {
		if (running) {
			// Remove the current page from the list of known sign-in forms.
			chrome.storage.sync.get(FORM_URLS_KEY, (items) => {
				if (typeof items[FORM_URLS_KEY] === 'undefined') {
					items[FORM_URLS_KEY] = [];
				}
				var index = items[FORM_URLS_KEY].indexOf(location.host + location.pathname);
				if (index !== -1) {
					items[FORM_URLS_KEY].splice(index, 1);
					chrome.storage.sync.set(items);
				}
				
				// Tell the background page to update the page action.
				chrome.runtime.sendMessage({ type: 'showDisabled' });
			});
			// Stop the scanner.
			disable();
		} else {
			// Add the current page to the list of known sign-in forms.
			chrome.storage.sync.get(FORM_URLS_KEY, (items) => {
				if (typeof items[FORM_URLS_KEY] === 'undefined') {
					items[FORM_URLS_KEY] = [];
				}
				if (items[FORM_URLS_KEY].indexOf(location.host + location.pathname) === -1) {
					items[FORM_URLS_KEY].push(location.host + location.pathname);
					chrome.storage.sync.set(items);
				}
				
				// Tell the background page to update the page action.
				chrome.runtime.sendMessage({ type: 'showEnabled' });
			});
			// Start the scannner.
			enable();
		}
	}
});

// Check whether current page is a known sign-in form.
chrome.storage.sync.get(FORM_URLS_KEY, (items) => {
	if (typeof items[FORM_URLS_KEY] === 'undefined') {
		items[FORM_URLS_KEY] = [];
	}
	if (items[FORM_URLS_KEY].indexOf(location.host + location.pathname) === -1) {
		// Tell the background page to update the page action.
		chrome.runtime.sendMessage({ type: 'showDisabled' });
	} else {
		// Tell the background page to update the page action.
		chrome.runtime.sendMessage({ type: 'showEnabled' });
		// Start the scanner.
		enable();
	}
});
