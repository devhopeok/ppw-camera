var pgReady = $.Deferred();
 
function onDeviceReady(){
	console.log("deviceready");
	receivedEvent('deviceready');
	
	window.resolveLocalFileSystemURL('cdvfile://localhost/persistent/', function(oEntry){
		console.log(oEntry);
	}, function(){
		console.log('Error resolving persistent path');
	});
	
	window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function(fileSystem){
		console.log("FS: fileSystem.root.toURL(): "+fileSystem.root.toURL()); // ANDROID: file:///data/data/com.propertypreswizard.app.propertypreswizard/files/files/
		console.log("FS: fileSystem.root.toInternalURL(): "+fileSystem.root.toInternalURL()); // cdvfile://localhost/persistent/
		console.log("FS: fileSystem.root.nativeURL: "+fileSystem.root.nativeURL); // ANDROID: file:///data/data/com.propertypreswizard.app.propertypreswizard/files/files/
		
		if (typeof(fnComplete) == 'function'){
			fnComplete(fileSystem.root.toURL());
		}
	
	});
}

function receivedEvent(id) {
	var parentElement = document.getElementById(id);
	var listeningElement = parentElement.querySelector('.listening');
	var receivedElement = parentElement.querySelector('.received');
	
	listeningElement.setAttribute('style', 'display:none;');
	receivedElement.setAttribute('style', 'display:block;');
	
	console.log('Received Event: ' + id);
}
 
init_phonegap(); // Only used for testing, to bypass DB init

//////////////////////////////////////
// INIT: Phonegap
//////////////////////////////////////
function init_phonegap(){
	console.log("INIT: Phonegap");

	if (!navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry)/)) {
		console.log("MOBILE: No");
		window.isMobile = false;
		
		pgReady.resolve();
	} else {
		console.log("MOBILE: Yes");
		window.isMobile = true;
		
		// Inject Phonegap placeholder. The actual script is injected by PGB. This can probably be converted to jQuery
		var script = document.createElement('script');
		script.src = "cordova.js";
		script.type = 'text/javascript';
		document.getElementsByTagName('head')[0].appendChild(script);
		
		$(document).on("deviceready", function () {
			console.log("INIT EVENT: Deviceready");
			pgReady.resolve();
		});	
	}
}

//////////////////////////////////////
// INIT EVENT: Phonegap
//////////////////////////////////////
$.when(pgReady).then(function() {
	console.log("INIT EVENT: Phonegap Ready");
	
	if (navigator.splashscreen){
		navigator.splashscreen.hide(); // Splash screen has a 5 second timeout by default, kill it
	}
	
	onDeviceReady(); // Call before jQuery Mobile is loaded
	
	//$('head').append();
});

function listFiles(){
	$("#debug").html("");
	
	// Retrieve files in temp
	window.requestFileSystem(LocalFileSystem.TEMPORARY, 0, onFileSystemSuccess, onFileSystemError);
	
	// Retrieve files in persistent
	window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, onFileSystemSuccess, onFileSystemError);
}

function debug(str){
	$("#debug").append(str + "<br/>");
}

function onFileSystemSuccess(fileSystem){
	//console.log("fileSystem1.name: " + fileSystem.name);
	//console.log("fileSystem1.root: " + fileSystem.root);
	//console.log("fileSystem1.root.fullPath: " + fileSystem.root.fullPath)
	
	// List files in this folder
	var directoryReader = fileSystem.root.createReader();
	directoryReader.readEntries(function(entries) {
		console.log(fileSystem.name + " directoryReader.readEntries");
		debug("<b>" + fileSystem.name + " directoryReader.readEntries</b>");
		
		var i;
		for (i=0; i<entries.length; i++) {
			console.log(entries[i].name);
			debug("[" + i + "]: " + entries[i].name);
		}
		debug("<br/>");
	}, function (error) {
		alert(error.code);
	})
	
	// Write dummy file 
	fileSystem.root.getFile(fileSystem.name + "_654321.txt", {create: true}, function(fileEntry){
		fileEntry.createWriter(function(writer){
			//console.log("writer.fileName: " + writer.fileName);
			
			var filePath = "cdvfile://localhost/" + fileSystem.name + "/" + fileEntry.name;
			
			writer.onwrite = function(evt) {
				console.log("createWriter onwrite");
			};
			
			writer.onwriteend = function(evt) {
				console.log("createWriter onwriteend");
				console.log("filePath: " + filePath);
				//console.log("writer.fileName: " + writer.fileName);
				
				// See if this function works at aall
/*				window.resolveLocalFileSystemURL(filePath, 
				function(fileEntry2){
					console.log("resolved");
				},
				function(error){
					console.log("unable to resolve");
				});*/
			};
			
			writer.write("some sample text");
			writer.abort();
		}, function(){
			console.log("createWriter fail")
		});
	
	}, function(){
		console.log("getFile fail")
	});
}

function onFileSystemError(error){
	console.log("requestFileSystem failed " + error);
}

function capturePhoto(){
	$("#debug").html("");
	
	var aoOverlay = [
		{
			type: 'text', // Plain text (default)
			position: 'top center',  // Centered, also center justified
			value: 'Camera Test',
			size: '12', // always in sp (scale-independant pixels)
			top: 8 // Vertical offset from top (also in scale-independant pixels)
		},
		{
			type: 'text', // Plain text (default)
			position: 'bottom left', // Left justified text
			value: '640x480',
			size: '10',
			left: 4, // Horizontal offset from left
			bottom: 4 // Vertical offset from bottom
		}
	];
	
	var oSettings = {
		quality: 80, //value from 0 to 100
		encodingType: 'jpg', //only jpg or png
		previewWidth: 640, //camera aspect preview
		previewHeight: 480,
		targetWidth: 640, //output target size
		targetHeight: 480,
		overlay: aoOverlay
	}
	// Custom Camera Plugin	
	navigator.PPWCamera.getPicture(oSettings, onCaptureSuccess, onCaptureError);
}

function onCaptureSuccess(oImage){
	sImageURI = oImage['imageURI'];
	
	console.log(sImageURI);
	
	var sFilePath = sImageURI;
	
	if (sFilePath.indexOf('file://') == -1){
		var sFilePath = 'file://' + sImageURI;
	}
	
	var sPersistentPath = '';
	
	
	// Attach to filesystem
	var fsRequestLocal = function(fileEntry){
		// Get file system to copy or move image file to
		requestFileSystem(LocalFileSystem.PERSISTENT, 0, function(fileSystem) {
			console.log('FS: requestFileSystem success ' + fileSystem.name);
			
			sPersistentPath = fileSystem.root.toURL();
			
			fsGetPhotosDir(fileEntry, fileSystem);
			
		},function(error){
			console.error('FS: requestFileSystem failed ' + error.code);
			msg_error('Error attaching filesystem');
		});	
	}
	
	// Create photos folder if it doesn't exist
	var fsGetPhotosDir = function(fileEntry, fileSystem){
		fileSystem.root.getDirectory('photos', {
			create : true
		}, function(directoryEntry) {
			console.log('FS: photos directory created');
			//console.log(directoryEntry);
			
			fsMove(fileEntry, directoryEntry);
		}, function(error){
			console.log('FS: getDirectory failed ' + error.code);
			msg_error('Error creating folder');
		});
	}
	
	// Move photo from temp to photos
	var fsMove = function(fileEntry, dataDir){
		// copy the file
		fileEntry.moveTo(dataDir, fileEntry['name'], 
		function(newFile){
			console.log('FS: moveTo success: dataDir: ' + dataDir['name']);
			console.log('FS: destination path: ' + newFile['fullPath']);
			console.log('FS: destination URL: ' + newFile.toURL());
			console.log('FS: internal URL: ' + newFile.toInternalURL());
			
			var sHtml = '';
			//var sFilename = sFilename = sPath.substring(sPath.lastIndexOf('/')+1);
			
			sHtml += '<br><img src="' + newFile.toURL() + '" alt="Test" width="20%" height="20%"></img>';
			sHtml += '<br><img src="' + newFile.toInternalURL() + '" alt="Test" width="20%" height="20%"></img>';
			
			$('#container-camera-test').html(sHtml);
		}, 
		function(error){
			console.error('moveTo failed ' + error.code);
			msg_error('Error moving photo');
		}
		)
	}
	
	console.log('FS: resolve path ' + sFilePath);
	
	// Resolve file system for image
	resolveLocalFileSystemURL(sFilePath, function(fileEntry){
    	console.log('FS: resolveLocalFileSystemURL success ' + fileEntry.fullPath);
		
		// Get file info
		fileEntry.file(function(oFile) {		
            fsRequestLocal(fileEntry);
        });
	
		
	}, function(error){
		console.error('FS: resolveLocalFileSystemURL failed ' + error.code);
	}); 

	
/*	
	// format file:///storage/emulated/0/Android/data/com.phonegap.hello_world_camera/cache/1397956654505.jpg
	
	//window.resolveLocalFileSystemURL(imageURI, resolveLocalFileSystemOnSuccess, resolveLocalFileSystemOnFail);
	
	imageURI_1 = imageURI.replace("storage/emulated/0", "sdcard");
	console.log("imageURI_1: " + imageURI_1);	
	//window.resolveLocalFileSystemURL(imageURI_1, resolveLocalFileSystemOnSuccess, resolveLocalFileSystemOnFail);
	
	imageURI_2 = imageURI.replace("file://", "");
	console.log("imageURI_2: " + imageURI_2);		
	//window.resolveLocalFileSystemURL(imageURI_2, resolveLocalFileSystemOnSuccess, resolveLocalFileSystemOnFail);
	
	//window.resolveLocalFileSystemURL("garbage", resolveLocalFileSystemOnSuccess, resolveLocalFileSystemOnFail);*/

}

function onCaptureError(error){
	console.log("camera.getPicture: " + error);
}

function resolveLocalFileSystemOnSuccess(fileEntry){
	console.log("resolveLocalFileSystemURL success");
	debug("resolveLocalFileSystemURL success");
	
	// get file system to copy or move image file to
	window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, requestFileSystemOnSuccess,requestFileSystemOnFail);	
}

function resolveLocalFileSystemOnFail(error){
	console.log("resolveLocalFileSystemURL failed error.code: " + error.code);
	debug("resolveLocalFileSystemURL failed error.code: " + error.code);
}

function requestFileSystemOnSuccess(fileSystem){
	console.log("requestFileSystem success");
	
	//var report_id = window.localStorage["report_id"];
	
	//alert("Default Image Directory " + fileEntry.fullPath);
	
/*					fileSystem.root.getDirectory('photos\\' + report_id, {
		create : true
	}, function(dataDir) {
		console.log("getDirectory success");
		
		//new file name
		var newFileName = report_id + "_" + moment().unix(); + ".jpg";
		
		// copy the file
		fileEntry.moveTo(dataDir, newFileName, null, function(error){
			console.log("moveTo failed " + error.code);
		})
	}, function(error){
		console.log("getDirectory failed " + error.code);
	});*/
}

function requestFileSystemOnFail(error){
	console.log("requestFileSystem failed " + error.code);
}

