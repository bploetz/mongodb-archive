archive.js
===============================

A library which adds methods to DBCollection to facilitate archiving documents in a MongoDB collection to another MongoDB database.
This library supports two modes of archiving: immediate archiving, and a mark & sweep approach which allows you to queue documents
to archive, and perform the actual archiving at a later time.

Examples
-------------------------------

Assume we have a large collection of ad clicks which are associated with ads. We want to archive clicks which are associated with
ads which expired more than 3 months ago.


### Immediate Archiving

Save the following to a file named `archive_clicks.js` in the same directory that you saved `archive.js` to:

    load("archive.js");
    
    threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth()-3);
    expiredAdIds = [];
    getExpiredAds = function(ad) {expiredAdIds.push(ad._id.str);}
    db.ads.find({end_date: {$lte: threeMonthsAgo}}).forEach(getExpiredAds);
    
    archiveConnection = new Mongo("localhost:27018");
    archiveDB = archiveConnection.getDB("archive");
    archiveCollection = archiveDB.getCollection("clicks");
    
    for (var i = 0; i < expiredAdIds.length; i++) {
      print("archiving clicks for ad_id: " + expiredAdIds[i]);
      db.clicks.archive({"ad_id": expiredAdIds[i]}, archiveCollection);
    }


Run this script using the mongo shell:

    mongo localhost:27017/mydb archive_clicks.js


### Queued Archiving:

Save the following to a file named `queue_clicks_for_archive.js` in the same directory that you saved `archive.js` to:

    load("archive.js");
    
    threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth()-3);
    expiredAdIds = [];
    getExpiredAds = function(ad) {expiredAdIds.push(ad._id.str);}
    db.ads.find({end_date: {$lte: threeMonthsAgo}}).forEach(getExpiredAds);
    
    archiveConnection = new Mongo("localhost:27018");
    archiveDB = archiveConnection.getDB("archive");
    archiveCollection = archiveDB.getCollection("clicks");
    
    for (var i = 0; i < expiredAdIds.length; i++) {
      print("queuing clicks for ad " + expiredAdIds[i] + " for archive");
      db.clicks.queueForArchive({"ad_id": expiredAdIds[i]});
    }


Save the following to a file named `archive_queued_clicks.js` in the same directory that you saved `archive.js` to:

    load("archive.js");
    
    threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth()-3);
    expiredAdIds = [];
    getExpiredAds = function(ad) {expiredAdIds.push(ad._id.str);}
    db.ads.find({end_date: {$lte: threeMonthsAgo}}).forEach(getExpiredAds);
    
    archiveConnection = new Mongo("localhost:27018");
    archiveDB = archiveConnection.getDB("archive");
    archiveCollection = archiveDB.getCollection("clicks");
    
    for (var i = 0; i < expiredAdIds.length; i++) {
      print("archiving clicks queued for archive for ad_id: " + expiredAdIds[i]);
      db.clicks.archiveQueued(archiveCollection);
    }


To queue documents to be archived, run the `queue_clicks_for_archive.js` script using the mongo shell:

    mongo localhost:27017/mydb queue_clicks_for_archive.js


Then at a later time, to archive any queued documents, run the `archive_queued_clicks.js` script using the mongo shell:

    mongo localhost:27017/mydb archive_queued_clicks.js
