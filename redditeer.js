
/* Replace LifeProTips with the Subreddit Name */
var REDDIT = "LifeProTips";

function run() {
  
   deleteTriggers_();
  
  /* Fetch Reddit posts every 5 minutes to avoid hitting 
     the reddit and Google Script quotas */
  ScriptApp.newTrigger("scrapeReddit")
           .timeBased().everyMinutes(5).create();  
}


function scrapeReddit() {
  
  // Process 20 Reddit posts in a batch
  var url = "https://www.reddit.com/r/" 
            + REDDIT + "/new.xml?limit=20" + getLastID_(); 

  // Reddit API returns the results in XML format  
  var response = UrlFetchApp.fetch(url);  
  var doc = XmlService.parse(response.getContentText()); 
  var entries = doc.getRootElement()
                   .getChildren('channel')[0].getChildren("item");
  
  var data = new Array();
    
  for (var i=0; i<entries.length; i++) {
        
    /* Extract post date, title, description and link from Reddit */

    var date = entries[i].getChild('pubDate').getText();
    var title = entries[i].getChild('title').getText();
    var desc = entries[i].getChild('description').getText();
    var link = entries[i].getChild('link').getText();
    
    data[i] = new Array(date, title, desc, link);
  }
  
  if (data.length == 0) {
    /* There's no data so stop the background trigger */
    deleteTriggers_();
  } else {    
    writeData_(data);
  }
}


/* Write the scrapped data in a batch to the 
   Google Spreadsheet since this is more efficient */
function writeData_(data) {
  
  if (data.length === 0) {
    return;
  } 
    
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheets()[0];
  var row = sheet.getLastRow();
  var col = sheet.getLastColumn();
      
  var range = sheet.getRange(row+1, 1, data.length, 4);
  try {
    range.setValues(data);
  } catch (e) {
    Logger.log(e.toString());
  }
}

/* Use the ID of the last processed post from Reddit as token */
function getLastID_() {

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheets()[0];
  var row = sheet.getLastRow();
  var col = sheet.getLastColumn();
  
  var url = sheet.getRange(row, col).getValue().toString();
  var pattern = /.*comments\/([^\/]*).*/; 
  var id = url.match(pattern);
  
  return id ? "&after=t3_" + id[1] : "";

}

/* Posts Extracted, Delete the Triggers */
function deleteTriggers_() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i=0; i<triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }
}