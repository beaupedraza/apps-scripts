/*

----------------------------------------------
Status: Work in progress


Author: Beau Pedraza

Description: Simple standalone function that pulls in Google Autosuggest terms
Description: for a given seed keyword. 

Lessons Learned #1: If you want the script to work, see client=

----------------------------------

Step 1: Build the function for a given (keyword)
Step 2: Set variables for the JSON output (response) and 
  for the text within that response
Step 3: In that response full of json content text, parse!
Step 4: Turn that readable af badboy into a thing you can use, a variable (keywords)
...
Finally: Return keywords

*/

function getGoogleSuggest(keyword) {

  var googleSuggestUrl = 'https://suggestqueries.google.com/complete/search?client=firefox&hl=en&q=' + keyword;
  var response = UrlFetchApp.fetch(googleSuggestUrl);
  var keywords = JSON.parse(response.getContentText());

  return keywords;
}
