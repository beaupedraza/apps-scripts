/*

----------------------------------------------
Status: Work in progress


Author: Beau Pedraza

Description: Simple standalone function that pulls in Google Autosuggest terms
Description: for a given seed keyword. 

Lessons Learned #1: If you want the script to work, see client=

----------------------------------


*/

function getGoogleSuggest(keyword) {

  var googleSuggestUrl = 'https://suggestqueries.google.com/complete/search?client=firefox&hl=en&q=' + keyword;
  var response = UrlFetchApp.fetch(googleSuggestUrl);
  var keywords = JSON.parse(response.getContentText());

  return keywords;
}
