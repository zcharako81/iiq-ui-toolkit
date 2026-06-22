package com.iiq.ui.toolkit;

import sailpoint.rest.plugin.AllowAll;
import sailpoint.rest.plugin.BasePluginResource;

import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import java.util.HashMap;
import java.util.Map;

/**
 * REST endpoint for IIQ-UI-Toolkit plugin settings.
 * Serves plugin settings as JSON so the client-side core loader
 * can determine which modules to activate.
 */
@Path("IIQUIToolkit")
@AllowAll
public class UIToolkitRestResource extends BasePluginResource {

    @Override
    public String getPluginName() {
        return "IIQ_UI_Toolkit";
    }

    @GET
    @Path("settings")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getSettings() {
        Map<String, Object> settings = new HashMap<>();
        settings.put("approvalItems.lineBreak", getSettingBool("approvalItems.lineBreak"));
        settings.put("approvalItems.hideApplication", getSettingBool("approvalItems.hideApplication"));
        settings.put("approvalItems.hideNativeIdentity", getSettingBool("approvalItems.hideNativeIdentity"));
        settings.put("approvalItems.changeHighlight", getSettingBool("approvalItems.changeHighlight"));
        settings.put("approvalItems.showFormValues", getSettingString("approvalItems.showFormValues"));
        settings.put("approvalItems.itemAging", getSettingBool("approvalItems.itemAging"));
        return Response.ok(settings).build();
    }
}
