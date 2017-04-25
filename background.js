'use strict';

var API_KEY = 'FILL_THIS_IN', // Do not push the API key to the repo!
	FORM_URL_REGEX = '^https://docs\.google\.com/forms/.+/viewform$';

// Set the rule when the extension is installed or upgraded.
chrome.runtime.onInstalled.addListener(function() {
	chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
		chrome.declarativeContent.onPageChanged.addRules([
			{
				conditions: [
					new chrome.declarativeContent.PageStateMatcher({
						pageUrl: { urlMatches: FORM_URL_REGEX },
					})
				],
				actions: [
					new chrome.declarativeContent.ShowPageAction()
				]
			}
		]);
	});
});

// Send an init request when the page action is clicked.
chrome.pageAction.onClicked.addListener(function (tab) {
	chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
		chrome.tabs.sendMessage(tabs[0].id, { type: "init"});
	});
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
	if (request.type === 'api') {
		var xhr = new XMLHttpRequest();
		
		xhr.open('GET', 'http://ritstar.com/api/member?id=' + request.memberId + '&key=' + API_KEY, true);
		
		xhr.onreadystatechange = function () {
			if (xhr.readyState === 4) {
				sendResponse({
					aoeu: 500,
					status: xhr.status,
					url: xhr.responseURL,
					responseText: xhr.responseText
				});
			}
		}
		
		xhr.send();
		
		return true; // Indicate a response will be sent asynchronously.
	}
});
