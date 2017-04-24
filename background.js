chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
	var xhr = new XMLHttpRequest();
	
	xhr.open('GET', 'http://localhost:8080/api/member?id=' + request.memberId, true); // For debugging
	//xhr.open('GET', 'http://ritstar.com/api/member?id=' + request.memberId, true);
	
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
