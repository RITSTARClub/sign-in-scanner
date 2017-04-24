var API_KEY = 'FILL_THIS_IN'; // Do not push the API key to the repo!

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
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
});
