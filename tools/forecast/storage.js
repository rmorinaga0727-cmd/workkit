/* Local-only storage. Dataset writes are transactional; failures preserve old data. */
(() => {'use strict';let dbPromise;
 function db(){return dbPromise??=new Promise((resolve,reject)=>{const q=indexedDB.open('workkit-forecast-v3',1);q.onupgradeneeded=()=>q.result.createObjectStore('datasets');q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});}
 async function get(){const database=await db();return new Promise((resolve,reject)=>{const tx=database.transaction('datasets','readonly'),q=tx.objectStore('datasets').get('current');q.onsuccess=()=>resolve(q.result||null);q.onerror=()=>reject(q.error);});}
 async function put(value){const database=await db();return new Promise((resolve,reject)=>{const tx=database.transaction('datasets','readwrite');if(value===null)tx.objectStore('datasets').delete('current');else tx.objectStore('datasets').put(value,'current');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Local storage aborted'));});}
 async function saveSnapshot(id,value){const database=await db();return new Promise((resolve,reject)=>{const tx=database.transaction('datasets','readwrite');tx.objectStore('datasets').put(value,'diagnosis:'+id);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Snapshot save aborted'));});}
 async function getSnapshot(id){const database=await db();return new Promise((resolve,reject)=>{const q=database.transaction('datasets','readonly').objectStore('datasets').get('diagnosis:'+id);q.onsuccess=()=>resolve(q.result||null);q.onerror=()=>reject(q.error);});}
 function read(key,fallback){try{const x=JSON.parse(localStorage.getItem(key));return x??fallback;}catch{return fallback;}}
 function write(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}}
 window.ForecastStorage={get,put,read,write,saveSnapshot,getSnapshot};
})();
