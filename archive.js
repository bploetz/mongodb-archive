/**
 * archive.js
 *
 * A library which adds methods to DBCollection to facilitate
 * archiving documents to another database.
 *
 * @author Brian Ploetz
 */


/**
 * Queues any documents which meet the given criteria as ready to be archived.
 * This sets the "markFieldName" field to "q" (queued). A sparse index is ensured
 * on "markFieldName".
 *
 * @param {Array} query the query to be passed to collection.find().
 *                This can be anything that collection.find() supports.
 * @param {String} markFieldName the field name to use to mark documents as
 *                 queued to be archived. If null or empty string is passed,
 *                 a field named "arch" will be used by default.
 */
DBCollection.prototype.queueForArchive = function(query, markFieldName) {
  if (markFieldName == undefined || markFieldName == null || markFieldName == "") {
    markFieldName = "arch";
  }
  var count = 0;
  var collection = this;
  print("ensuring sparse index on field \"" + markFieldName + "\"");
  eval("collection.ensureIndex({\"" + markFieldName + "\": 1}, {sparse: true, background: true})");
  print("marking documents for archive...");
  var start = new Date();
  eval("collection.update(query, {$set: {\"" + markFieldName + "\": 'q'}}, false, true)");
  result = this._db.getLastErrorObj();
  var end = new Date();
  print("queued " + result.n + " documents for archive in " + (end-start) + "ms.");
}


/**
 * For any documents which are queued to be archived (markFieldName: "q"),
 * saves them to archiveCollection and removes them from the source
 * collection. This adds a new field "archived_at" to the document
 * in the archiveCollection to note when it was archived.
 *
 * @param {Object} archiveCollection the collection to archive documents to.
 *                 this can be in a different database than the source collection
 * @param {String} markFieldName the field name marking documents to be
 *                 archived. This should be the same name used when calling
 *                 queueForArchive(). If null or empty string is passed, a
 *                 field named "arch" will be used by default.
 */
DBCollection.prototype.archiveQueued = function(archiveCollection, markFieldName) {
  if (markFieldName == undefined || markFieldName == null || markFieldName == "") {
    markFieldName = "arch";
  }
  var count = 0;
  var collection = this;
  var sweep = function(doc) {
    delete doc[markFieldName]
    doc["archived_at"] = new Date();
    archiveCollection.save(doc);
    // make sure the archive worked before removing the original
    if (archiveCollection.getDB().getLastError() != null) {
      throw "could not archive document with _id " + doc._id;
    } else {
      collection.remove({_id: doc._id});
      if (collection.getDB().getLastError() != null) {
        throw "could not remove document with _id " + doc._id;
      } else {
        count++;
      }
    }
  }
  print("archiving queued documents to " +  archiveCollection + "...");
  var start = new Date();
  eval("collection.find({\"" + markFieldName + "\": 'q'}).forEach(sweep)");
  var end = new Date();
  print("archived " + count + " queued documents to " + archiveCollection + " in " + (end-start) + "ms.");
}


/**
 * Immediately archives any documents which meet the given criteria by
 * saving them to archiveCollection and removing them from the source
 * collection. This adds a new field "archived_at" to the document
 * in the archiveCollection to note when it was archived.
 *
 * @param {Array} query the query to be passed to collection.find().
 *                This can be anything that collection.find() supports.
 * @param {Object} archiveCollection the collection to archive documents to.
 *                 this can be in a different database than the source collection
 */
DBCollection.prototype.archive = function(query, archiveCollection) {
  var count = 0;
  var collection = this;
  var sweep = function(doc) {
    doc["archived_at"] = new Date();
    archiveCollection.save(doc);
    // make sure the archive worked before removing the original
    if (archiveCollection.getDB().getLastError() != null) {
      throw "could not archive document with _id " + doc._id;
    } else {
      collection.remove({_id: doc._id});
      if (collection.getDB().getLastError() != null) {
        throw "could not remove document with _id " + doc._id;
      } else {
        count++;
      }
    }
  }
  print("archiving documents...");
  var start = new Date();
  collection.find(query).forEach(sweep);
  var end = new Date();
  print("archived " + count + " documents in " + (end-start) + "ms.");
}
