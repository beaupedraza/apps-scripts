// ---------------------------------------------------------------------------------------------------------------------------------------------------
// The MIT License (MIT)
// 
// Put together by Beau Pedraza
// Designed for Google Apps Script
// Inspired by some chatter here in the office
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.


// Maximum results to retrieve per api request:
var C_MAX_RESULTS = 250;


// When spreadsheet opens, this sets up the custom Jira and Story Cards menus, and the functions that they call when selected:
function onOpen(){
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var menuEntries = [{name: "Configure Jira", functionName: "jiraConfigure"},{name: "Refresh Data Now", functionName: "jiraPullManual"},{name: "Schedule 4 Hourly Automatic Refresh", functionName: "scheduleRefresh"},{name: "Stop Automatic Refresh", functionName: "removeTriggers"}]; 
  ss.addMenu("Jira", menuEntries);
                     
  menuEntries = [ {name: "Create cards", functionName: "createCardsFromBacklog"}, {name: "Create cards from selected rows", functionName: "createCardsFromSelectedRowsInBacklog"} ];
  ss.addMenu("Story Cards", menuEntries);
 }


// Called when the menu option is taken - stores project name, host name, story types and user/password
function jiraConfigure() {
  
  var prefix = Browser.inputBox("Enter the prefix for your Jira Project. e.g. TST", "Prefix", Browser.Buttons.OK);
  PropertiesService.getUserProperties().setProperty("prefix", prefix.toUpperCase());
  
  var host = Browser.inputBox("Enter the host name of your on demand instance e.g. toothCamp.atlassian.net", "Host", Browser.Buttons.OK);
  PropertiesService.getUserProperties().setProperty("host", host);
  
  var userAndPassword = Browser.inputBox("Enter your Jira On Demand User id and Password in the form User:Password. e.g. Tommy.Smith:ilovejira (Note: This will be base64 Encoded and saved as a property on the spreadsheet)", "Userid:Password", Browser.Buttons.OK_CANCEL);
  var x = Utilities.base64Encode(userAndPassword);
  PropertiesService.getUserProperties().setProperty("digest", "Basic " + x);
  
  var issueTypes = Browser.inputBox("Enter a comma separated list of the types of issues you want to import  e.g. story or story,epic,bug", "Issue Types", Browser.Buttons.OK);
  PropertiesService.getUserProperties().setProperty("issueTypes", issueTypes);


  Browser.msgBox("Jira configuration saved successfully.");
}  


// Removes any triggers that have been previouslycreated by scheduleRefresh method - called by one of the menu options.
function removeTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }
  
  Browser.msgBox("Spreadsheet will no longer refresh automatically.");
  
}  

// Creates a trigger to automatically refresh the data ever 4 hours.
function scheduleRefresh() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }
  
  ScriptApp.newTrigger("jiraPull").timeBased().everyHours(4).create();
  
  Browser.msgBox("Spreadsheet will refresh automatically every 4 hours.");

}  

// Function to manually refresh the spreadsheet - called when selected from Menu.
function jiraPullManual() {
  jiraPull();
  Browser.msgBox("Jira backlog successfully imported");
}  


// Function to return all the field definitions for the project in a key/value pair
function getFields() {
  return JSON.parse(getDataForAPI("field"));
  
}  


// function to return all the story data - either from a list on the instruction sheet, 
// otherwise all the non-resolved issues for the project are returned
// See here for api documentation: https://developer.atlassian.com/cloud/jira/platform/rest/#api-api-2-search-get
function getStories() {
  var allData = {issues:[]};
  var data = {startAt:0,maxResults:0,total:1};
  var startAt = 0;
  var jql = "search?jql=project%20%3D%20" + PropertiesService.getUserProperties().getProperty("prefix") + "%20and%20status%20!%3D%20resolved%20and%20type%20in%20("+ encodeURIComponent(getStoryTypes()) + ")%20order%20by%20rank%20&maxResults=" + C_MAX_RESULTS;
  var issues = SpreadsheetApp.getActive().getSheetByName("Instructions").getRange("B5:B5").getValues();
  if (issues != "") {
    var jql = "search?jql=key%20in%20%28"+ issues + "%29%20order%20by%20rank%20&maxResults=" + C_MAX_RESULTS;
  }  
  while (data.startAt + data.maxResults < data.total) {
    Logger.log("Making request for %s entries", C_MAX_RESULTS);
    data =  JSON.parse(getDataForAPI(jql+"&startAt=" + startAt));  
    allData.issues = allData.issues.concat(data.issues);
    startAt = data.startAt + data.maxResults;
  }  
  
  return allData;
}   

function getStoryTypes() {
  var types = PropertiesService.getUserProperties().getProperty("issueTypes");
  types = types.replace(/[\""]/g, '\\"')
  var allTypes = types.split(',');
  var newTypes = "";
  for (var i=0;i<allTypes.length;i++) {
    if (newTypes !="") {
      newTypes += ","
    }  
    newTypes += '"' + allTypes[i].trim() + '"';
  }  
  Logger.log(newTypes);
  return newTypes;
}   

// function that actually makes the http request
function getDataForAPI(path) {
  var url = "https://" + PropertiesService.getUserProperties().getProperty("host") + "/rest/api/2/" + path;
  var digestfull = PropertiesService.getUserProperties().getProperty("digest");
  
  var headers = { "Accept":"application/json", 
              "Content-Type":"application/json", 
              "method": "GET",
               "headers": {"Authorization": digestfull},
                 "muteHttpExceptions": true
             };
  
  var resp = UrlFetchApp.fetch(url,headers );
  if (resp.getResponseCode() != 200) {
    Browser.msgBox("Error retrieving data for url " + url + ":" + resp.getContentText());
    return "";
  }  
  else {
    return resp.getContentText();
  }  
  
} 

//
// Main function - called by the trigger or from the menu option
//

function jiraPull() {
  
  
  // Retrieve data using API
  var allFields = getAllFields();
  var data = getStories();  
  if (allFields === "" || data === "") {
    Browser.msgBox("Error pulling data from Jira - aborting now.");
    return;
  }  
  
  //
  //  ***** Put a breakpoint below here, select function jiraPullManual() and click on the debug icon above 
  //  ***** Then you should be able to look at the data field and see what data is available from the api.
  //
  
  // Retrieve column headings from backlog sheet.
  var ss = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Backlog");
  var headings = ss.getRange(1, 1, 1, ss.getLastColumn()).getValues()[0];
  
  // Process the stories and extract the data that matches the column headings into an array
  var y = new Array();
  for (i=0;i<data.issues.length;i++) {
    var d=data.issues[i];
    y.push(getStory(d,headings,allFields));
  }  
  
  // Output the contents of the array into the spreadsheet by clearing existing rows and adding new ones
  ss = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Backlog");
  var last = ss.getLastRow();
  if (last >= 2) {
    ss.getRange(2, 1, ss.getLastRow()-1,ss.getLastColumn()).clearContent();  
  }  
  if (y.length > 0) {
    ss.getRange(2, 1, data.issues.length,y[0].length).setValues(y);
  }
  
}

// Get array of field ids and names
function getAllFields() {
  
  var theFields = getFields();
  var allFields = new Object();
  allFields.ids = new Array();
  allFields.names = new Array();
  
  for (var i = 0; i < theFields.length; i++) {
      allFields.ids.push(theFields[i].id);
      allFields.names.push(theFields[i].name.toLowerCase());
  }  
  
  return allFields;
  
}  


// function that takes the story data and column headings, and tries to find the data that relates to those headings
function getStory(data,headings,fields) {
 
  var story = [];
  for (var i = 0;i < headings.length;i++) {
    if (headings[i] !== "") {
      var fieldData = getDataForHeading(data,headings[i].toLowerCase(),fields);
      if (fieldData != null) {
        fieldData = parseObject(fieldData);
      }  
      story.push(fieldData);
    }  
  }        
  
  return story;
  
}  

// Given a matched property from the returned data, this tries to then handle spsocial cases of arrays and objects (Strings are left untouched)
function parseObject(data) {
  
  var stringData = "";
  if (Array.isArray(data)) {
  
    for (var i = 0; i < data.length; i++) {
      if (stringData != "") {
          stringData+=",";
      }  
      if ( typeof data[i] === "object") {
        if (data[i].hasOwnProperty("id") && data[i].hasOwnProperty("value") && data[i].hasOwnProperty("self")) {
          stringData+= data[i]["value"];
        } 
        else if (data[i].hasOwnProperty("displayName")) {
          stringData+= data[i]["displayName"];
        } 
        else if (data[i].hasOwnProperty("name")) {
          stringData+= data[i]["name"];
        } 
        else {
          stringData+= JSON.stringify(data)
        }  
      }
      else {
        
        stringData+=data[i];
      }  
    }
  } 
  else if ( typeof data === "object") {
    if (data.hasOwnProperty("id") && data.hasOwnProperty("value") && data.hasOwnProperty("self")) {
          stringData+= data["value"];
    } 
    else if (data.hasOwnProperty("displayName")) {
          stringData+= data["displayName"];
    }  
    else if (data.hasOwnProperty("name")) {
          stringData+= data["name"];  
    } 
    else {
          stringData+= JSON.stringify(data)
        }  
    
  }
  else {
    stringData += data;
  }  
  return stringData;
}  

// Given a heading, interrogates the data to find a field with that name
function getDataForHeading(data,heading,fields) {
  
      if (data.hasOwnProperty(heading)) {
        return data[heading];
      }  
      else if (data.fields.hasOwnProperty(heading)) {
        return data.fields[heading];
      }  
  
      var fieldName = getFieldName(heading,fields);
  
      if (fieldName !== "") {
        if (data.hasOwnProperty(fieldName)) {
          return data[fieldName];
        }  
        else if (data.fields.hasOwnProperty(fieldName)) {
          return data.fields[fieldName];
        }  
      }
  
      var splitName = heading.split(" ");
  
      if (splitName.length == 2) {
        if (data.fields.hasOwnProperty(splitName[0]) ) {
          if (data.fields[splitName[0]] && data.fields[splitName[0]].hasOwnProperty(splitName[1])) {
            return data.fields[splitName[0]][splitName[1]];
          }
          return "";
        }  
      }  
  
      return "Could not find value for " + heading;
      
}  

function getFieldName(heading,fields) {
  var index = fields.names.indexOf(heading);
  if ( index > -1) {
     return fields.ids[index]; 
  }
  return "";
}  
               