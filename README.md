# jabsearch

A command line tool to check for 18+ vaccination slots in CoWin portal for a given pincode(s) or district. Just to automate the process of checking for slots in our preferred locations that is all. 

Already there are services like under45.in, getjab.in etc that does this if you want a neat zero effort solution please register there. 

However if you want to run this in your own machine and get notified you can use this utility.

> REMEMBER: The tool uses [Government COWIN API](https://cdn-api.co-vin.in/api/v2), this information is as reliable as the API data

**>>>> USE THIS AT YOUR OWN RISK<<<<<**

### Disclaimer
- This tool does not guarantee a vaccine slot it is just for checking whether a slot is available instead of using COWIN application UI to check frequently. 
- **I am not responsible for any of the data or decisions you take out of this utility, you are on your own.** 

- Due to speed of booking even if this utility says slots are available there is a possibility that the slots are booked before you login using OTP and try to book so please excuse if you are not able to find the slot in UI. 

### Requirements
1. Node JS version v15.5.0
2. NPM version 7.3.0

### Instructions to install
- Clone the repo
- Execute `npm install` command
- Open `index.js` and change the first 5 lines as per your requirement
```js
const pincodesToCheck = ['110001', '110002'];
const vaccinesToCheck = ['COVISHIELD', 'COVAXIN'];
const districtIdToCheck = 571;
const minutesToCheckFor = 15;
```
- Please use the APIs to find [State IDs](https://cdn-api.co-vin.in/api/v2/admin/location/states) and [District IDs](https://cdn-api.co-vin.in/api/v2/admin/location/districts/31)
- Run the command `npm start` 
- You will get desktop notifications for every check performed for N minutes configured
