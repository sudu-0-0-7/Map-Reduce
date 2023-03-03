/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/record', 'N/search', 'N/runtime'],
   /**
* @param{record} record
*/
   (record, search, runtime) => {
      const getInputData = (inputContext) => {
         try {
            var loadSearch = search.load({
               id: 'customsearch_wipfli_ss_param'
            });

            var searchResults = loadSearch.run();
            var searchObjects = searchResults.getRange(0, 1000);

            for (var i = 0; i < searchObjects.length; i++) {
               salesOrder = searchObjects[i];

               var returnValue = [];
               var workOrderSearch = search.create({
                  type: "workorder",
                  filters:
                     [
                        ["type", "anyof", "WorkOrd"],
                        "AND",
                        ["createdfrom", "anyof", salesOrder.id]
                     ],
                  columns:
                     [
                        search.createColumn({ name: "custbodyiqscompletedate", label: "Work Order Complete Date" })
                     ]
               });
               var searchResultCount = workOrderSearch.runPaged().count;
               if (searchResultCount > 0) {
                  var workOrderDetails = workOrderSearch.run();
                  var searchObject = workOrderDetails.getRange(0, 1000);
                  for (var j = 0; j < searchResultCount; j++) {
                     workOrder = searchObject[j];
                     returnValue.push(workOrder);
                     var workOrderJson = {
                        "id": returnValue
                     }

                  }
               }
            }
            return workOrderJson;
         }
         catch (e) {
            log.error("error in getInputData filed", e.message);
            return false;
         }
      }

      const map = (mapContext) => {
         try {
            workOrder = [];
            const workOrderJson = JSON.parse(mapContext.value);
            var workOrderCount = Object.keys(workOrderJson).length;

            for (var j = 0; j < workOrderCount; j++) {
               workOrder.push(workOrderJson[j].id)
            }

            salesOrderIds = [];
            invoiceIds = [];
            var loadSearch = search.load({
               id: 'customsearch_wipfli_ss_param'
            });
            var searchResults = loadSearch.run();
            var searchObjects = searchResults.getRange(0, 1000);
            for (var i = 0; i < searchObjects.length; i++) {
               salesOrder = searchObjects[i];
               salesOrderIds.push(salesOrder.id);
               var invoiceSearchObj = search.create({
                  type: "invoice",
                  filters:
                     [
                        ["type", "anyof", "CustInvc"],
                        "AND",
                        ["createdfrom", "anyof", salesOrder.id],
                        "AND",
                        ["mainline", "is", "T"]
                     ],
                  columns:
                     [
                        search.createColumn({ name: "internalid", label: "Internal ID" })
                     ]
               });
               var searchResultCount = invoiceSearchObj.runPaged().count;
               if (searchResultCount == 0) {
                  var inviceRecord = record.transform({
                     fromType: 'salesorder',
                     fromId: salesOrder.id,
                     toType: 'invoice',
                     isDynamic: true,
                  });
                  var invoiceId = inviceRecord.save();
                  invoiceIds.push(invoiceId);
               }
            }
            var trackerRecord = record.create({
               type: 'customrecord_wipfli_tracker_record',
               isDynamic: true,
            });

            trackerRecord.setValue({
               fieldId: 'custrecord_wipfli_sales_order',
               value: salesOrderIds
            });

            trackerRecord.setValue({
               fieldId: 'custrecord_wipfli_work_order',
               value: workOrder
            });

            trackerRecord.setValue({
               fieldId: 'custrecord_wipfli_invoice',
               value: invoiceIds
            });

            var saveTracker = trackerRecord.save();
         }

         catch (e) {
            log.error("error in map filed", e.message);
            return false;
         }
      }

      const reduce = (reduceContext) => {

      }

      const summarize = (summaryContext) => {

      }

      return { getInputData, map, reduce, summarize }

   });
