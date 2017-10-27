sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/m/MessageToast",
	"sap/m/Dialog",
	"sap/m/Button",
	"sap/ui/vbm/AnalyticMap",
	"sap/ui/model/json/JSONModel",
], function(Controller, MessageToast, Dialog, Button, AnalyticMap, JSONModel) {
	"use strict";	
	AnalyticMap.GeoJSONURL  =  "./util/L0.json";
	return Controller.extend("CreateServiceRequest.controller.display", {
		getRouter : function () {
				return sap.ui.core.UIComponent.getRouterFor(this);
		},
		onInit: function(){
			var oModel = new sap.ui.model.json.JSONModel("./util/Data.json");
		    this.getView().setModel(oModel);
		    
		 // set the device model
			
			 /*this.getView().addEventDelegate({ 
			 	onBeforeShow: function(){
			 		alert("sadfas")
			 	}
			 });*/
			/*this._oRouter = sap.ui.core.UIComponent.getRouterFor(this);
    		this._oRouter.attachRouteMatched(this.onBeforeShow, this);*/
			this.getRouter().getRoute("object").attachPatternMatched(this.onBeforeShow, this);
		},
		
		onBeforeShow : function(){
			console.log("In onBeforeShow");
			var oAppComponent = this.getOwnerComponent();
			var iLastHourUsage = oAppComponent.getComponentData().startupParameters.lastHourUsage[0];
			var iAverageUsage = oAppComponent.getComponentData().startupParameters.averageUsage[0];
			var oInputData = {
				"description":"",
				"category":"",
				"lastHourUsage":iLastHourUsage,
				"averageUsage":iAverageUsage
			}
			var oInputModel = new sap.ui.model.json.JSONModel(oInputData);
			this.getView().setModel(oInputModel, "oInputModel");
		},
		
		_fetchToken: function() {
		    var token;
		    $.ajax({
		        url: "/bpmworkflowruntime/workflow-service/rest/v1/xsrf-token",
		        method: "GET",
		        async: false,
		        headers: {
		            "X-CSRF-Token": "Fetch"
		        },
		        success: function(result, xhr, data) {
		            token = data.getResponseHeader("X-CSRF-Token");
		        }
		    });
		    return token;
		},
		
		onApproveIncidentCreation : function(){
			this.createC4CTicket();
		},
		
		onRejectIncidentCreation : function(){
			var msg = "Thanks for the response. No incident has been created."
			var sTitle = "Incident not created";
			this.updateBpmWorkflow(sTitle, msg);
		},
		
		updateBpmWorkflow : function(sTitle, msg){
			var token = this._fetchToken();
			var oAppComponent = this.getOwnerComponent();
			var taskInstanceId = oAppComponent.getComponentData().startupParameters.taskId[0];
			 var oAssignData = {
				"status":"COMPLETED",
				"context": {}
		    };
			$.ajax({
		        url: "/bpmworkflowruntime/workflow-service/rest/v1/task-instances/" + taskInstanceId,
		        method: "PATCH",
		        contentType: "application/json",
		        async: false,
		        data: JSON.stringify(oAssignData),
		        headers: {
		            "X-CSRF-Token": token
		        },
		        success: function(result, xhr, data) {
		            //this.pushNotification();
		             jQuery.sap.require("sap.m.MessageBox");
		            sap.m.MessageBox.show(msg,{
		        		title: sTitle,
		        		onClose:this.navigateToMyInbox
		        	});
		        }.bind(this),
		        error:function(){
		        	jQuery.sap.require("sap.m.MessageBox");
		        	sap.m.MessageBox.show("Process update failed. Please contact the system administrator",{
		        		icon: sap.m.MessageBox.Icon.ERROR,
		        		title: "Error"
		        	});
		        }
		    });
		},
		
		createC4CTicket : function(){
			var oInputData = this.getView().getModel("oInputModel").getData();
			var sServiceActivityID = oInputData.category==="Routinecheck" ?"WS_HP_VD_SW" :oInputData.category==="Repair"?"":"";
			var sServiceCauseID = oInputData.category==="Routinecheck"?"WS_HP_VD":oInputData.category==="Repair"?"":"";
			var sServiceIncidentID = oInputData.category==="Routinecheck"?"WS_HP":oInputData.category==="Repair"?"WS_LK":"";
			var sServiceIssueCategoryID = "WS";
            var oParams={
            	"Name":oInputData.description,
				"ServiceActivityID":sServiceActivityID,
				"ServiceCauseID":sServiceCauseID,
				"ServiceIncidentID":sServiceIncidentID,
				"ServiceIssueCategoryID":sServiceIssueCategoryID
            };
            var sServiceUrl= this.getOwnerComponent().getMetadata().getManifestEntry("sap.app").dataSources.create_service_ticket.uri;
            var oServiceModel = new sap.ui.model.odata.ODataModel(sServiceUrl, true);
            oServiceModel.refreshSecurityToken(
				function(a, b) {
					oServiceModel.oHeaders = {
				             "x-csrf-token" : b.headers["x-csrf-token"],
				              "Content-Type" : "application/json; charset=utf-8"
					};
					// Call the update method of the service model
					oServiceModel.create(
						"/ServiceRequestCollection",
						oParams,
						null,
						function(success) {
							this.linkLocationToTicket(success.results);
						}.bind(this),
						function(error) {
							var errordesc = JSON.parse(error.response.body).error.message.value;
							jQuery.sap.require("sap.m.MessageBox");
							sap.m.MessageBox.show(
									errordesc,
									{
										title : "{i18n>SAVE_Error}"
									});
						}.bind(this));
				}.bind(this), function(a) {
				      jQuery.sap.require("sap.m.MessageBox");
	        		sap.m.MessageBox.show("Incident creation failed. Please contact the system administrator",{
		        		icon: sap.m.MessageBox.Icon.ERROR,
		        		title: "Error"
		        	});
				}.bind(this), true);
		},
		
		linkLocationToTicket : function(oTicketDetails){
            var oParams={
            	"ParentObjectID":oTicketDetails.ObjectID,
            	"SerialID":"HP_VDET00001"
            };
            var sServiceUrl= this.getOwnerComponent().getMetadata().getManifestEntry("sap.app").dataSources.create_service_ticket.uri;
            var oServiceModel = new sap.ui.model.odata.ODataModel(sServiceUrl, true);
            oServiceModel.refreshSecurityToken(
				function(a, b) {
					oServiceModel.oHeaders = {
				             "x-csrf-token" : b.headers["x-csrf-token"],
				              "Content-Type" : "application/json; charset=utf-8"
					};
					// Call the update method of the service model
					oServiceModel.create(
						"/ServiceRequestServiceReferenceObjectCollection",
						oParams,
						null,
						function(success) {
							var msg = "Incident created successfully! Please note the Incident Id for future: " + oTicketDetails.ID;
							var sTitle = "Incident created";
							this.updateBpmWorkflow(sTitle, msg);
						}.bind(this),
						function(error) {
							var errordesc = JSON.parse(error.response.body).error.message.value;
							jQuery.sap.require("sap.m.MessageBox");
							sap.m.MessageBox.show(
									errordesc,
									{
										title : "{i18n>SAVE_Error}"
									});
						}.bind(this));
				}.bind(this), function(a) {
				      jQuery.sap.require("sap.m.MessageBox");
	        		sap.m.MessageBox.show("Incident creation failed. Please contact the system administrator",{
		        		icon: sap.m.MessageBox.Icon.ERROR,
		        		title: "Error"
		        	});
				}, true);
		},
		
		navigateToMyInbox : function(){
			var oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");
            var oShellHash = "#WorkflowTask-DisplayMyInbox";
            oCrossAppNavigator.toExternal( {
            	target : { shellHash : oShellHash }
            });
		},
		
		handleLinkPress : function(){
			var oAnalyticMap = new AnalyticMap();
			var oOxfordCircles = new sap.ui.vbm.Circles();
			var oOxfordCircle = new sap.ui.vbm.Circle();
			oOxfordCircle.setPosition("-1.207552;51.727985;0");
			oOxfordCircles.addItem(oOxfordCircle);
			oAnalyticMap.addVo(oOxfordCircles);
			if (!this.fixedSizeDialog) {
				this.fixedSizeDialog = new Dialog({
					title: 'John Smith Dr, Oxford',
					contentWidth: "850px",
					contentHeight: "600px",
					content: oAnalyticMap,
					beginButton: new Button({
						text: 'Close',
						press: function () {
							this.fixedSizeDialog.close();
						}.bind(this)
					})
				});

				//to get access to the global model
				this.getView().addDependent(this.fixedSizeDialog);
			}

			this.fixedSizeDialog.open();
		/*	var oView = this.getView();
			var oDialog = oView.byId("helloDialog");
			// create dialog lazily
			if (!oDialog) {
				// create dialog via fragment factory
				oDialog = sap.ui.xmlfragment(oView.getId(), "CreateServiceRequest.view.fragment.map");
				// connect dialog to view (models, lifecycle)
				oView.addDependent(oDialog);
			}

			oDialog.open();*/
		},
		
		 onPressLegend: function ()	{
			 if(this.byId("vbi").getLegendVisible()==true){
				 this.byId("vbi").setLegendVisible(false);
				 this.byId("btnLegend").setTooltip("Show legend");
			 }
			 else{
				 this.byId("vbi").setLegendVisible(true);
				 this.byId("btnLegend").setTooltip("Hide legend");
			 }
		},

		onPressResize: function ()	{
			if(this.byId("btnResize").getTooltip()=="Minimize"){
				if (sap.ui.Device.system.phone) {
					this.byId("vbi").minimize(132,56,1320,560);//Height: 3,5 rem; Width: 8,25 rem
				} else {
					this.byId("vbi").minimize(168,72,1680,720);//Height: 4,5 rem; Width: 10,5 rem
				}				
				this.byId("btnResize").setTooltip("Maximize");
			}
			else{
				this.byId("vbi").maximize();
				this.byId("btnResize").setTooltip("Minimize");
			}
		},

		onRegionClick: function (e)
		{
			sap.m.MessageToast.show( "onRegionClick " + e.getParameter( "code" ) );
		},

		onRegionContextMenu: function ( e )
		{
			sap.m.MessageToast.show( "onRegionContextMenu " + e.getParameter( "code" ) );
		},
	
		onClickItem: function (evt)	{
			alert("onClick");
		},

		onContextMenuItem: function ( evt )	{
			alert("onContextMenu");
		},
	
		onClickCircle: function (evt)	{
			alert("Circle onClick");
		},

		onContextMenuCircle: function ( evt )	{
			alert("Circle onContextMenu");
		}

	});
});