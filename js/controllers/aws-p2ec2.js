// Obdi - a REST interface and GUI for deploying software
// Copyright (C) 2014  Mark Clarkson
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

// ------------------------------------------------------------------------
// AngularJS Controller
// ------------------------------------------------------------------------

mgrApp.controller("awsp2ec2", function ($scope,$http,$uibModal,$log,
      $timeout,baseUrl,$rootScope) {

  // Data
  $scope.regions = [];
  $scope.region = {};
  $scope.scriptlines = "";
  $scope.reservations = [];
  $scope.instances = [];
  $scope.notifyme = {};
  $scope.notifyme.now = false;
  $scope.datacopy = {};
  $scope.dirsize = {};
  $scope.migrate = {};

  // Pages
  $scope.mainview = true;

  // Alerting
  $scope.message = "";
  $scope.mainmessage = "";
  $scope.okmessage = "";
  $scope.login.error = false;

  // Hiding/Showing
  $scope.showmainbtnblock = true;
  $scope.showkeybtnblockhidden = false;
  $scope.btnchooseAWSregion = true;
  $scope.btnlistInstancesDisabled = true;
  $scope.btncreateInstanceDisabled = true;
  $scope.btncreateVolumeDisabled = true;
  $scope.btnsayhellopressed = false;
  $scope.btnregionListDisabled = false;
  $scope.page_result = false;
  $scope.envchosen = false;
  $scope.list_instances = false;
  $scope.create_volume = false;
  $scope.status = {};
  $scope.dirsize_not_started = true;
  $scope.dirsize_in_progress = false;
  $scope.dirsize_complete = false;
  $scope.migrate.page = false;

  // Disable the search box
  $rootScope.$broadcast( "searchdisabled", true );

  // ----------------------------------------------------------------------
  $scope.$on( "search", function( event, args ) {
  // ----------------------------------------------------------------------
  // Not used since search is disabled

    if( $scope.grainsview.show == false ) {
      $scope.hostfilter = args;
      $scope.checkbox_allnone = false;
      for( var i=0; i < $scope.servernames.length; i=i+1 ) {
        $scope.servernames[i].Selected = false;
      }
      ReviewBtnStatus();
    } else {
      $scope.grainfilter = args;
    }
  });

  // ----------------------------------------------------------------------
  var clearMessages = function() {
  // ----------------------------------------------------------------------
    $scope.message = "";
    $scope.mainmessage = "";
    $scope.okmessage = "";
    $scope.login.error = false;
    $scope.error = false;
  }

  // ----------------------------------------------------------------------
  $scope.Restart = function() {
  // ----------------------------------------------------------------------
    clearMessages();
    $scope.page_result = false;
    $scope.envchosen = false;
    $scope.list_instances = false;
    $scope.create_volume = false;
    $scope.btnregionListDisabled = false;
    $scope.btncreateInstanceDisabled = true;
    $scope.btncreateVolumeDisabled = true;
    $scope.btnlistInstancesDisabled = true;
    $scope.showmainbtnblock = true;
    $scope.dirsize_not_started = true;
    $scope.dirsize_in_progress = false;
    $scope.dirsize_complete = false;
    $scope.migrate.page = false;

    var box = $('#mainbtnblock');
    box.removeClass('visuallyhidden');
    box.removeClass('hidden');
    box.removeClass('overflowhidden');
  };

  // ----------------------------------------------------------------------
  $scope.envChoice = function( obj, $event ) {
  // ----------------------------------------------------------------------
    clearMessages();
    $event.preventDefault();
    $event.stopPropagation();
    $scope.envchosen = true;
    $scope.btnregionListDisabled = true;
    $scope.region = obj;
    $scope.btnlistInstancesDisabled = false;
    $scope.btncreateVolumeDisabled = false;
    $scope.btncreateInstanceDisabled = true;
    $scope.showmainbtnblock = true;
    $scope.status.isopen = !$scope.status.isopen; //close the dropdown
  };

  // ----------------------------------------------------------------------
  $scope.GoBack = function( ) {
  // ----------------------------------------------------------------------
    clearMessages();
    $scope.mainview = true;
    $scope.btnregionListDisabled = false;
    $scope.btnlistInstancesDisabled = true;
    $scope.btncreateInstanceDisabled = true;
    $scope.btncreateVolumeDisabled = true;
    $scope.showmainbtnblock = true;
    $scope.dirsize_not_started = true;
    $scope.dirsize_in_progress = false;
    $scope.dirsize_complete = false;
    $scope.migrate.page = false;

    // Reset the search text (not used since search is disabled)
    //$rootScope.$broadcast( "setsearchtext", $scope.previousfilter );
  }

  // ----------------------------------------------------------------------
  $scope.goBack = function( id ) {
  // ----------------------------------------------------------------------

    if( typeof $rootScope.awsp2ec2_plugin.back === "undefined" ) {
      $scope.setView( "plugins/systemjobs/html/view.html" );
    } else {
      $scope.setView( $rootScope.awsp2ec2_plugin.back )
    }
  }

  // ----------------------------------------------------------------------
  $scope.FillRegionsTable = function() {
  // ----------------------------------------------------------------------

    $http({
      method: 'GET',
      url: baseUrl + "/" + $scope.login.userid + "/" + $scope.login.guid
           + "/aws-ec2lib/describe-regions"
           + '?time='+new Date().getTime().toString()
    }).success( function(data, status, headers, config) {

      try {
        $scope.regions = $.parseJSON(data.Text);
      } catch (e) {
        clearMessages();
        $scope.message = "Error: " + e;
      }

    }).error( function(data,status) {
      if (status>=500) {
        $scope.login.errtext = "Server error.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      } else if (status==401) {
        $scope.login.errtext = "Session expired.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      } else if (status>=400) {
        clearMessages();
        $scope.mainmessage = "Server said: " + data['Error'];
      } else if (status==0) {
        // This is a guess really
        $scope.login.errtext = "Could not connect to server.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      } else {
        $scope.login.errtext = "Logged out due to an unknown error.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      }
    });
  };

  // ----------------------------------------------------------------------
  $scope.Migrate = function( ) {
  // ----------------------------------------------------------------------
  // Runs the helloworld-runscript.sh script on the worker.

    $scope.envchosen = false;
    $scope.create_volume = false;
    $scope.migrate = {};
    $scope.migrate.page = true;

    $scope.migrate.obdi_worker_availzone = {};
    $scope.migrate.obdi_worker_availzone.status = "started";

    $http({
      method: 'GET',
      url: baseUrl + "/" + $scope.login.userid + "/" + $scope.login.guid
           + "/aws-p2ec2/get-not-so-secret-data?env_id="
           + $rootScope.awsp2ec2_plugin.envId
           + '&time='+new Date().getTime().toString()
    }).success( function(data, status, headers, config) {

      try {
        $scope.awsdata = $.parseJSON(data.Text);
      } catch (e) {
        clearMessages();
        $scope.message = "Error: " + e;
      }

      $scope.migrate.obdi_worker_availzone.status = "gotinstanceid";

      $scope.Migrate_GetAvailZone( $scope.awsdata.Aws_obdi_worker_instance_id );

    }).error( function(data,status) {
      if (status>=500) {
        $scope.login.errtext = "Server error.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      } else if (status==401) {
        $scope.login.errtext = "Session expired.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      } else if (status>=400) {
        clearMessages();
        $scope.message = "Server said: " + data['Error'];
        $scope.error = true;
      } else if (status==0) {
        // This is a guess really
        $scope.login.errtext = "Could not connect to server.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      } else {
        $scope.login.errtext = "Logged out due to an unknown error.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      }
    });
  };

  // ----------------------------------------------------------------------
  $scope.Migrate_GetAvailZone = function( instance_id ) {
  // ----------------------------------------------------------------------
  // Runs the helloworld-runscript.sh script on the worker.

    $http({
      method: 'GET',
      url: baseUrl + "/" + $scope.login.userid + "/" + $scope.login.guid
           + "/aws-ec2lib/describe-instances?env_id="
           + $rootScope.awsp2ec2_plugin.envId
           + "&region=" + $scope.awsdata.Aws_obdi_worker_region
           + "&filter=instance-id=" + instance_id
           + '&time='+new Date().getTime().toString()
    }).success( function(data, status, headers, config) {

      try {
        $scope.awsworker = $.parseJSON(data.Text);
      } catch (e) {
        clearMessages();
        $scope.message = "Error: " + e;
      }

      if( $scope.awsworker == null ) {
          $scope.message = "Error: Could not get the availability zone " +
                           "the Obdi worker is in. Check settings for " +
                           "capability AWS_ACCESS_KEY_ID_1 in the Admin interface.";
      }

      $scope.migrate.obdi_worker_availzone.status = "finished";

      $scope.Migrate_CheckAvailZone();

    }).error( function(data,status) {
      if (status>=500) {
        $scope.login.errtext = "Server error.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      } else if (status==401) {
        $scope.login.errtext = "Session expired.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      } else if (status>=400) {
        clearMessages();
        $scope.message = "Server said: " + data['Error'];
        $scope.error = true;
      } else if (status==0) {
        // This is a guess really
        $scope.login.errtext = "Could not connect to server.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      } else {
        $scope.login.errtext = "Logged out due to an unknown error.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      }
    });
  };

  // ----------------------------------------------------------------------
  $scope.Migrate_CheckAvailZone = function( ) {
  // ----------------------------------------------------------------------
  // Runs the helloworld-runscript.sh script on the worker.

    $scope.migrate.obdi_worker_check_availzone = {};
    $scope.migrate.obdi_worker_check_availzone.status = "started";

    $http({
      method: 'GET',
      url: baseUrl + "/" + $scope.login.userid + "/" + $scope.login.guid
           + "/aws-ec2lib/describe-availability-zone?env_id="
           + $rootScope.awsp2ec2_plugin.envId
           + "&region=" + $scope.awsdata.Aws_obdi_worker_region
           + "&availability_zone="
           + $scope.awsworker[0].Instances[0].AvailabilityZone
           + '&time='+new Date().getTime().toString()
    }).success( function(data, status, headers, config) {

      try {
        var azstatus = $.parseJSON(data.Text);
      } catch (e) {
        clearMessages();
        $scope.message = "Error: " + e;
      }

      if( azstatus == null ) {
        $scope.message = "Error: Could not get the status of the availability " +
                         "zone the Obdi worker is in."
      }

      $scope.migrate.obdi_worker_check_availzone.status = "finished";
      $scope.migrate.obdi_worker_check_availzone.state = "OK ("
          + azstatus.AvailabilityZones[0].State + ")";
      $scope.migrate.obdi_worker_check_availzone.message = "";
      if( azstatus.AvailabilityZones[0].State != "available" ) {
        $scope.migrate.obdi_worker_check_availzone.state = "NOT OK ("
            + azstatus.AvailabilityZones[0].State + ")";
        $scope.migrate.obdi_worker_check_availzone.message =
            azstatus.AvailabilityZones[0].Messsages;
        clearMessages();
        $scope.message = "Error: Process was aborted. See below.";
        return
      }

      $scope.Migrate_CreateVolume();

    }).error( function(data,status) {
      if (status>=500) {
        $scope.login.errtext = "Server error.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      } else if (status==401) {
        $scope.login.errtext = "Session expired.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      } else if (status>=400) {
        clearMessages();
        $scope.message = "Server said: " + data['Error'];
        $scope.error = true;
      } else if (status==0) {
        // This is a guess really
        $scope.login.errtext = "Could not connect to server.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      } else {
        $scope.login.errtext = "Logged out due to an unknown error.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      }
    });
  };

  // ----------------------------------------------------------------------
  $scope.Migrate_CreateVolume = function( ) {
  // ----------------------------------------------------------------------
  // Runs the helloworld-runscript.sh script on the worker.

    $scope.migrate.create_volume = {};
    $scope.migrate.create_volume.status = "started";
    $scope.migrate.create_volume.volumeid = "error";

    var num = parseInt( $scope.datacopy.size_gb );

    var params = {
                   Size: num,
                   VolumeType: "gp2"
                 };

    $http({
      method: 'POST',
      data: params,
      url: baseUrl + "/" + $scope.login.userid + "/" + $scope.login.guid
           + "/aws-ec2lib/create-volume?env_id="
           + $rootScope.awsp2ec2_plugin.envId
           + "&region=" + $scope.awsdata.Aws_obdi_worker_region
           + "&availability_zone="
           + $scope.awsworker[0].Instances[0].AvailabilityZone
           + '&time='+new Date().getTime().toString()
    }).success( function(data, status, headers, config) {

      try {
        $scope.ebsvolume = $.parseJSON(data.Text);
      } catch (e) {
        clearMessages();
        $scope.message = "Error: " + e;
      }

      if( $scope.ebsvolume == null ) {
        $scope.message = "Error: Create Volume returned no data. Check " +
                         "to see if the volume was created and report this error."
      }

      $scope.migrate.create_volume.status = "finished";
      $scope.migrate.create_volume.volumeid = $scope.ebsvolume.VolumeId;

      // NEXT...
      $scope.Migrate_WaitForVolume();

    }).error( function(data,status) {
      if (status>=500) {
        $scope.login.errtext = "Server error.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      } else if (status==401) {
        $scope.login.errtext = "Session expired.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      } else if (status>=400) {
        clearMessages();
        $scope.message = "Server said: " + data['Error'];
        $scope.error = true;
      } else if (status==0) {
        // This is a guess really
        $scope.login.errtext = "Could not connect to server.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      } else {
        $scope.login.errtext = "Logged out due to an unknown error.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      }
    });
  };

  // ----------------------------------------------------------------------
  $scope.Migrate_WaitForVolume = function( ) {
  // ----------------------------------------------------------------------
  // Runs the helloworld-runscript.sh script on the worker.

    var params = { "volume_id":[$scope.migrate.create_volume.volumeid] };

    $scope.migrate.attach_volume = {};
    $scope.migrate.attach_volume.status = "waiting";

    $http({
      method: 'GET',
      params: params,
      url: baseUrl + "/" + $scope.login.userid + "/" + $scope.login.guid
           + "/aws-ec2lib/describe-volumes?env_id="
           + $rootScope.awsp2ec2_plugin.envId
           + "&region=" + $scope.awsdata.Aws_obdi_worker_region
           + '&time='+new Date().getTime().toString()
    }).success( function(data, status, headers, config) {

      try {
        $scope.ebsvolumestatus = $.parseJSON(data.Text);
      } catch (e) {
        clearMessages();
        $scope.message = "Error: " + e;
      }

      if( $scope.ebsvolumestatus == null ) {
        $scope.message = "Error: Create Volume returned no data. Check " +
                         "to see if the volume was created and report this error."
      }

      $scope.migrate.create_volume.status = "finished";
      $scope.migrate.create_volume.volumeid = $scope.ebsvolume.VolumeId;

      // NEXT...
      if( $scope.ebsvolumestatus.Volumes[0].State == "available" ) {
        $scope.migrate.attach_volume = {};
        $scope.migrate.attach_volume.status = "started";
        $scope.Migrate_AttachVolume(0);
      } else {
        $scope.Migrate_WaitForVolume();
      }

    }).error( function(data,status) {
      if (status>=500) {
        $scope.login.errtext = "Server error.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      } else if (status==401) {
        $scope.login.errtext = "Session expired.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      } else if (status>=400) {
        clearMessages();
        $scope.message = "Server said: " + data['Error'];
        $scope.error = true;
      } else if (status==0) {
        // This is a guess really
        $scope.login.errtext = "Could not connect to server.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      } else {
        $scope.login.errtext = "Logged out due to an unknown error.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      }
    });
  };

  // ----------------------------------------------------------------------
  $scope.Migrate_AttachVolume = function( i ) {
  // ----------------------------------------------------------------------
  // Runs the helloworld-runscript.sh script on the worker.

    $scope.migrate.attach_volume.mountpoint = "error";

    var letters=["b","c","d","e","f","g","h","i","j","k","l","m","n",
                 "o","p","q","r","s","t","u","v","w","x","y","z"];

    if( i >= letters.length ) {
        $scope.message = "Error: Could not find any free mount points on "
                       + $scope.awsdata.Aws_obdi_worker_instance_id + ". "
                       + "You will need to delete the volume, "
                       + $scope.migrate.create_volume.volumeid + ", "
                       + "and free up a drive letter on "
                       + $scope.awsdata.Aws_obdi_worker_instance_id + ".";
        $scope.error = true;
        return;
    }

    var params = {
                   Device: "/dev/sd" + letters[i],
                   InstanceId: $scope.awsdata.Aws_obdi_worker_instance_id,
                   VolumeId: $scope.migrate.create_volume.volumeid
                 };

    $http({
      method: 'POST',
      data: params,
      url: baseUrl + "/" + $scope.login.userid + "/" + $scope.login.guid
           + "/aws-ec2lib/attach-volume?env_id="
           + $rootScope.awsp2ec2_plugin.envId
           + "&region=" + $scope.awsdata.Aws_obdi_worker_region
           + "&availability_zone="
           + $scope.awsworker[0].Instances[0].AvailabilityZone
           + '&time='+new Date().getTime().toString()
    }).success( function(data, status, headers, config) {

      try {
        $scope.attachvolume = $.parseJSON(data.Text);
      } catch (e) {
        clearMessages();
        $scope.message = "Error: " + e;
      }

      if( $scope.attachvolume == null ) {
        $scope.Migrate_AttachVolume(i+1);
        /*
        $scope.message = "Error: Attach Volume returned no data. Check " +
                         "to see if the volume was created and report this error."
        */
      }

      $scope.migrate.attach_volume.status = "attaching";
      $scope.migrate.attach_volume.mountpoint = $scope.attachvolume.Device;

      // NEXT...
      $scope.Migrate_WaitForAttach(0);

    }).error( function(data,status) {
      if (status>=500) {
        $scope.login.errtext = "Server error.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      } else if (status==401) {
        $scope.login.errtext = "Session expired.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      } else if (status==400) {
        $scope.migrate.attach_volume.status = "retrying";
        $scope.Migrate_AttachVolume(i+1);
      } else if (status>=400) {
        clearMessages();
        $scope.message = "Server said: " + data['Error'];
        $scope.error = true;
      } else if (status==0) {
        // This is a guess really
        $scope.login.errtext = "Could not connect to server.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      } else {
        $scope.login.errtext = "Logged out due to an unknown error.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      }
    });
  };

  // ----------------------------------------------------------------------
  $scope.Migrate_WaitForAttach = function( i ) {
  // ----------------------------------------------------------------------
  // Runs the helloworld-runscript.sh script on the worker.

    if( i > 50 ) {
        $scope.message = "Error: Volume did not attach after "
                       + i + " attempts. Monitor the volume,"
                       + $scope.migrate.create_volume.volumeid + ", "
                       + " on host "
                       + $scope.awsdata.Aws_obdi_worker_instance_id
                       + " using the AWS EC2 console, and delete"
                       + "the volume.";
        $scope.error = true;
        return;
    }

    var params = { "volume_id":[$scope.migrate.create_volume.volumeid] };

    $http({
      method: 'GET',
      params: params,
      url: baseUrl + "/" + $scope.login.userid + "/" + $scope.login.guid
           + "/aws-ec2lib/describe-volumes?env_id="
           + $rootScope.awsp2ec2_plugin.envId
           + "&region=" + $scope.awsdata.Aws_obdi_worker_region
           + '&time='+new Date().getTime().toString()
    }).success( function(data, status, headers, config) {

      try {
        $scope.ebsvolumestatus = $.parseJSON(data.Text);
      } catch (e) {
        clearMessages();
        $scope.message = "Error: " + e;
      }

      if( $scope.ebsvolumestatus == null ) {
        $scope.message = "Error: Create Volume returned no data. Check " +
                         "to see if the volume was created and report this error."
      }

      $scope.migrate.attach_volume.status = "finished";
      $scope.migrate.attach_volume.mountpoint = $scope.attachvolume.Device;

      // NEXT...
      if( $scope.ebsvolumestatus.Volumes[0].Attachments[0].State != "attached" ) {
        $scope.Migrate_WaitForAttach(i+1);
      } else {
        $scope.Migrate_CopyFiles();
      }

    }).error( function(data,status) {
      if (status>=500) {
        $scope.login.errtext = "Server error.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      } else if (status==401) {
        $scope.login.errtext = "Session expired.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      } else if (status>=400) {
        clearMessages();
        $scope.message = "Server said: " + data['Error'];
        $scope.error = true;
      } else if (status==0) {
        // This is a guess really
        $scope.login.errtext = "Could not connect to server.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      } else {
        $scope.login.errtext = "Logged out due to an unknown error.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      }
    });
  };

  // ----------------------------------------------------------------------
  $scope.Migrate_CopyFiles = function( ) {
  // ----------------------------------------------------------------------
  // Runs the helloworld-runscript.sh script on the worker.

    $scope.migrate.copy_files = {};
    $scope.migrate.copy_files.status = "started";

    var num = parseInt( $scope.datacopy.size_gb );

    var patharr = $scope.awsp2ec2_plugin.path.split('/');

    $http({
      method: 'POST',
      url: baseUrl + "/" + $scope.login.userid + "/" + $scope.login.guid
           + "/rsyncbackup/remotecopy?env_id="
           + $rootScope.awsp2ec2_plugin.envId
           + "&task_id=" + $scope.awsp2ec2_plugin.taskId
           + "&path=" + $scope.awsp2ec2_plugin.path
           + "&mountdev=" + $scope.migrate.attach_volume.mountpoint
           + "&mountdir=" + "/incoming/" + patharr[patharr.length-1]
           + '&time='+new Date().getTime().toString()
    }).success( function(data, status, headers, config) {

      $scope.message_jobid = data.JobId;
      $scope.okmessage = "Copy files started.";
      $scope.PollForJobFinish(data.JobId,1000,0,$scope.CopyFinished);

    }).error( function(data,status) {
      if (status>=500) {
        $scope.login.errtext = "Server error.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      } else if (status==401) {
        $scope.login.errtext = "Session expired.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      } else if (status>=400) {
        clearMessages();
        $scope.message = "Server said: " + data['Error'];
        $scope.error = true;
      } else if (status==0) {
        // This is a guess really
        $scope.login.errtext = "Could not connect to server.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      } else {
        $scope.login.errtext = "Logged out due to an unknown error.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      }
    });
  };

  // ----------------------------------------------------------------------
  $scope.CopyFinished = function( id ) {
  // ----------------------------------------------------------------------

    $scope.migrate.copy_files.status = "finished";

    $scope.migrate.osedits = {};
    $scope.migrate.osedits.status = "started";

    var num = parseInt( $scope.datacopy.size_gb );

    var patharr = $scope.awsp2ec2_plugin.path.split('/');

    $http({
      method: 'POST',
      url: baseUrl + "/" + $scope.login.userid + "/" + $scope.login.guid
           + "/aws-p2ec2/osedits?env_id="
           + $rootScope.awsp2ec2_plugin.envId
           + "&task_id=" + $scope.awsp2ec2_plugin.taskId
           + "&path=" + $scope.awsp2ec2_plugin.path
           + "&umountdir=true"
           + '&time='+new Date().getTime().toString()
    }).success( function(data, status, headers, config) {

      $scope.message_jobid = data.JobId;
      $scope.okmessage = "Copy files started.";
      $scope.PollForJobFinish(data.JobId,1000,0,$scope.ModifyOSFinished);

    }).error( function(data,status) {
      if (status>=500) {
        $scope.login.errtext = "Server error.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      } else if (status==401) {
        $scope.login.errtext = "Session expired.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      } else if (status>=400) {
        clearMessages();
        $scope.message = "Server said: " + data['Error'];
        $scope.error = true;
      } else if (status==0) {
        // This is a guess really
        $scope.login.errtext = "Could not connect to server.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      } else {
        $scope.login.errtext = "Logged out due to an unknown error.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      }
    });
  }

  // ----------------------------------------------------------------------
  $scope.ModifyOSFinished = function( id ) {
  // ----------------------------------------------------------------------

    $scope.migrate.osedits.status = "finished";
  }

  // Polling functions

  // ----------------------------------------------------------------------
  $scope.ListInstances = function( ) {
  // ----------------------------------------------------------------------
  // Runs the helloworld-runscript.sh script on the worker.

    $scope.envchosen = false;
    $scope.list_instances = true;
    $scope.list_instances_inprogress = true;
    $scope.list_instances_results = false;
    $scope.list_instances_empty = false;

    $http({
      method: 'GET',
      url: baseUrl + "/" + $scope.login.userid + "/" + $scope.login.guid
           + "/aws-ec2lib/describe-instances?env_id="
           + $rootScope.awsp2ec2_plugin.envId
           + "&region=" + $scope.region.Name
           + '&time='+new Date().getTime().toString()
    }).success( function(data, status, headers, config) {

      try {
        $scope.reservations = $.parseJSON(data.Text);
      } catch (e) {
        clearMessages();
        $scope.message = "Error: " + e;
      }

      $scope.list_instances_inprogress = false;
      $scope.list_instances_empty = true;

      // Pull out all the instances
      $scope.instances = [];

      if( !$scope.reservations ) return;

      for( var i=0; i<$scope.reservations.length; ++i) {
        for( var j=0; j<$scope.reservations[i].Instances.length; ++j) {
          $scope.instances.push($scope.reservations[i].Instances[j]);
          $scope.list_instances_empty = false;
          $scope.list_instances_results = true;
        }
      }

    }).error( function(data,status) {
      if (status>=500) {
        $scope.login.errtext = "Server error.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      } else if (status==401) {
        $scope.login.errtext = "Session expired.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      } else if (status>=400) {
        clearMessages();
        $scope.message = "Server said: " + data['Error'];
        $scope.error = true;
      } else if (status==0) {
        // This is a guess really
        $scope.login.errtext = "Could not connect to server.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      } else {
        $scope.login.errtext = "Logged out due to an unknown error.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      }
    });
  };

  // ----------------------------------------------------------------------
  $scope.CalcDirSize = function( ) {
  // ----------------------------------------------------------------------

    $scope.dirsize_not_started = false;
    $scope.dirsize_in_progress = true;
    $scope.dirsize_complete = false;

    $http({
      method: 'GET',
      url: baseUrl + "/" + $scope.login.userid + "/" + $scope.login.guid
           + "/rsyncbackup/dirsize?env_id="
           + $rootScope.awsp2ec2_plugin.envId
           + "&task_id="
           + $scope.awsp2ec2_plugin.taskId
           + "&path="
           + $scope.awsp2ec2_plugin.path
           + '&time='+new Date().getTime().toString()
    }).success( function(data, status, headers, config) {

      $scope.PollForJobFinish(data.JobId,10,0,$scope.GetDirSizeOutputLine);

    }).error( function(data,status) {
      if (status>=500) {
        $scope.login.errtext = "Server error.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      } else if (status==401) {
        $scope.login.errtext = "Session expired.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      } else if (status>=400) {
        clearMessages();
        $scope.message = "Server said: " + data['Error'];
        $scope.error = true;
      } else if (status==0) {
        // This is a guess really
        $scope.login.errtext = "Could not connect to server.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      } else {
        $scope.login.errtext = "Logged out due to an unknown error.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      }
    });
  }

  // ----------------------------------------------------------------------
  $scope.GetDirSizeOutputLine = function( id ) {
  // ----------------------------------------------------------------------

    $http({
      method: 'GET',
      url: baseUrl + "/" + $scope.login.userid + "/" + $scope.login.guid
           + "/outputlines?job_id=" + id
           + '&time='+new Date().getTime().toString()
    }).success( function(data, status, headers, config) {

      $scope.dirsize = {};

      // Extract data into array
      //
      try {
        $scope.dirsize = $.parseJSON(data[0].Text);
      } catch (e) {
        clearMessages();
        $scope.message = "Error: " + e;
        $scope.message_jobid = id;
      }

      $scope.dirsize_not_started = false;
      $scope.dirsize_in_progress = false;
      $scope.dirsize_complete = true;

      if( $scope.notifyme.now == true )
        $scope.notifyMe("Obdi job has finished.");

      $scope.datacopy.size_gb = Math.round(($scope.dirsize[0].sizeb)/1000/1000/1000) + 20;

    }).error( function(data,status) {
      if (status>=500) {
        $scope.login.errtext = "Server error.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      } else if (status>=400) {
        $scope.login.errtext = "Session expired.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      } else if (status==0) {
        // This is a guess really
        $scope.login.errtext = "Could not connect to server.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      } else {
        $scope.login.errtext = "Logged out due to an unknown error.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      }
    });
  };

  // ----------------------------------------------------------------------
  $scope.notifySetup = function( ) {
  // ----------------------------------------------------------------------

    // Let's check if the browser supports notifications
    if (!("Notification" in window)) {
      alert("This browser does not support desktop notification");
    }

    // Let's check whether notification permissions have already been granted
    else if (Notification.permission !== "granted") {
      Notification.requestPermission(function (permission) {
        if (permission !== "granted") {
          ; // set a variable
        }
      });
    }
  }

  // ----------------------------------------------------------------------
  $scope.notifyMe = function( text ) {
  // ----------------------------------------------------------------------

    // Let's check if the browser supports notifications
    if (!("Notification" in window)) {
      alert("This browser does not support desktop notification");
    }

    // Let's check whether notification permissions have already been granted
    else if (Notification.permission === "granted") {
      // If it's okay let's create a notification
      var notification = new Notification(text);
    }

    // Otherwise, we need to ask the user for permission
    else if (Notification.permission !== 'denied') {
      Notification.requestPermission(function (permission) {
        // If the user accepts, let's create a notification
        if (permission === "granted") {
          var notification = new Notification(text);
        }
      });
    }

    // At last, if the user has denied notifications, and you
    // want to be respectful there is no need to bother them any more.
  }

  // ----------------------------------------------------------------------
  $scope.CreateWhat = function( ) {
  // ----------------------------------------------------------------------

    if( $scope.datacopy.wants_instance ) return "Instance";
    if( $scope.datacopy.wants_ami ) return "AMI";
    if( $scope.datacopy.wants_snapshot ) return "Snapshot";
    return "Volume";
  }

  // ----------------------------------------------------------------------
  $scope.style = function( n ) {
  // ----------------------------------------------------------------------
    ret = "";

    switch( n ) {
      // case 0:  // pending
      // case 16: // running
      case 48: // terminated
        ret = "danger";
        break;
      case 32: // shutting down
      case 64: // stopping
      case 80: // stopped
        ret = "warning";
        break;
    }

    return ret;
  }

  // ----------------------------------------------------------------------
  $scope.CreateVolume = function( ) {
  // ----------------------------------------------------------------------

    $timeout( function() {
      var box = $('#mainbtnblock');
      box.addClass('visuallyhidden');
      box.addClass('overflowhidden');
      box.one('transitionend', function(e) { box.addClass('hidden'); });
    }, 300);

    $scope.list_instances = false;
    $scope.btnlistInstancesDisabled = true;
    $scope.btncreateInstanceDisabled = true;
    $scope.btncreateVolumeDisabled = false;
    $scope.showmainbtnblock = false;
    $scope.envchosen = false;
    $scope.create_volume = true;

    $scope.datacopy = {};
    $scope.datacopy.instance_type = "t1.micro";
  };

  // ----------------------------------------------------------------------
  $scope.CreateVolumeREST = function( ) {
  // ----------------------------------------------------------------------
  // Runs the helloworld-runscript.sh script on the worker.

    $scope.envchosen = false;
    $scope.list_instances = true;
    $scope.list_instances_inprogress = true;
    $scope.list_instances_results = false;
    $scope.list_instances_empty = false;

    $http({
      method: 'GET',
      url: baseUrl + "/" + $scope.login.userid + "/" + $scope.login.guid
           + "/aws-ec2lib/describe-instances?env_id="
           + $rootScope.awsp2ec2_plugin.envId
           + "&region=" + $scope.region.Name
           + '&time='+new Date().getTime().toString()
    }).success( function(data, status, headers, config) {

      try {
        $scope.reservations = $.parseJSON(data.Text);
      } catch (e) {
        clearMessages();
        $scope.message = "Error: " + e;
      }

      $scope.list_instances_inprogress = false;
      $scope.list_instances_empty = true;

      // Pull out all the instances
      $scope.instances = [];
      for( var i=0; i<$scope.reservations.length; ++i) {
        for( var j=0; j<$scope.reservations[i].Instances.length; ++j) {
          $scope.instances.push($scope.reservations[i].Instances[j]);
          $scope.list_instances_empty = false;
          $scope.list_instances_results = true;
        }
      }

    }).error( function(data,status) {
      if (status>=500) {
        $scope.login.errtext = "Server error.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      } else if (status==401) {
        $scope.login.errtext = "Session expired.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      } else if (status>=400) {
        clearMessages();
        $scope.message = "Server said: " + data['Error'];
        $scope.error = true;
      } else if (status==0) {
        // This is a guess really
        $scope.login.errtext = "Could not connect to server.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      } else {
        $scope.login.errtext = "Logged out due to an unknown error.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      }
    });
  };

  // ----------------------------------------------------------------------
  $scope.GetInstancesOutputLine = function( id ) {
  // ----------------------------------------------------------------------

    $http({
      method: 'GET',
      url: baseUrl + "/" + $scope.login.userid + "/" + $scope.login.guid
           + "/outputlines?job_id=" + id
           + '&time='+new Date().getTime().toString()
    }).success( function(data, status, headers, config) {

      try {
        $scope.instances = $.parseJSON(data.Text);
      } catch (e) {
        clearMessages();
        $scope.message = "Error: " + e;
      }

      $scope.page_result = true;

    }).error( function(data,status) {
      if (status>=500) {
        $scope.login.errtext = "Server error.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      } else if (status>=400) {
        $scope.login.errtext = "Session expired.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      } else if (status==0) {
        // This is a guess really
        $scope.login.errtext = "Could not connect to server.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      } else {
        $scope.login.errtext = "Logged out due to an unknown error.";
        $scope.login.error = true;
        $scope.login.pageurl = "login.html";
      }
    });
  };

  // ----------------------------------------------------------------------
  $scope.PollForJobFinish = function( id,delay,count,func ) {
  // ----------------------------------------------------------------------
      $timeout( function() {
        $http({
          method: 'GET',
          url: baseUrl + "/" + $scope.login.userid + "/" + $scope.login.guid
               + "/jobs?job_id=" + id
               + '&time='+new Date().getTime().toString()
        }).success( function(data, status, headers, config) {
          job = data[0];
          if(job.Status == 0 || job.Status == 1 || job.Status == 4) {
            if( count > 5000 ) { // 5000 - usually 120, this could take long
              clearMessages();
              $scope.message = "Job took too long. check job ID " +
                               + id + ", then try again.";
              $scope.message_jobid = job['Id'];
            } else {
              // Then retry: capped exponential backoff
              delay = delay < 600 ? delay * 2 : 1000;
              count = count + 1;
              $scope.PollForJobFinish(id,delay,count,func);
            }
          } else if(job.Status == 5) { // Job was successfully completed
            func( id );
          } else { // Some error
            clearMessages();
            $scope.message = "Server said: " + job['StatusReason'];
            $scope.message_jobid = job['Id'];
          }
        }).error( function(data,status) {
          if (status>=500) {
            $scope.login.errtext = "Server error.";
            $scope.login.error = true;
            $scope.login.pageurl = "login.html";
          } else if (status==401) {
            $scope.login.errtext = "Session expired.";
            $scope.login.error = true;
            $scope.login.pageurl = "login.html";
          } else if (status>=400) {
            clearMessages();
            $scope.message = "Server said: " + data['Error'];
            $scope.error = true;
          } else if (status==0) {
            // This is a guess really
            $scope.login.errtext = "Could not connect to server.";
            $scope.login.error = true;
            $scope.login.pageurl = "login.html";
          } else {
            $scope.login.errtext = "Logged out due to an unknown error.";
            $scope.login.error = true;
            $scope.login.pageurl = "login.html";
          }
        });
      }, delay );
  };

  // Modal dialog

  // --------------------------------------------------------------------
  $scope.helloDialog = function () {
  // --------------------------------------------------------------------

    var name = $scope.env.DispName;

    var modalInstance = $uibModal.open({
      templateUrl: 'helloModal.html',
      controller: $scope.ModalInstanceCtrl,
      size: 'sm',
      resolve: {
        // the name variable is passed to the ModalInstanceCtrl
        name: function () {
          return name;
        }
      }
    });

    modalInstance.result.then(function (name) {
      $log.info('Will do something with: ' + $scope.name );
      //
      // Call a function to do something here
      //
    }, function () {
      $log.info('Modal dismissed at: ' + new Date());
    });
  };

  // --------------------------------------------------------------------
  $scope.ModalInstanceCtrl = function ($scope, $uibModalInstance, name) {
  // --------------------------------------------------------------------

    // So the template can access 'name' in this new scope
    $scope.name = name;

    $scope.ok = function () {
      $uibModalInstance.close();
    };

    $scope.cancel = function () {
      $uibModalInstance.dismiss('cancel');
    };
  };

  // Get the list of regions straight away
  $scope.notifySetup();
  $scope.FillRegionsTable();
});
