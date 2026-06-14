const API_URL=process.env.NEXT_PUBLIC_API_BASE_URL || '/apix';



const apiRoutes ={
    //ctrl desk and console
    MENU_CTRLDESK : `${API_URL}/companyRoutes/console_menu_items`,
    SUPERADMINLOGINCONSOLE : `${API_URL}/authRoutes/loginconsole`,
    USERLOGINCONSOLE : `${API_URL}/authRoutes/login`,
    PROTECTED : `${API_URL}/authRoutes/protected`,
    VERIFYSESSION : `${API_URL}/authRoutes/verify-session`,
    VALIDATE_SUBDOMAIN : `${API_URL}/authRoutes/validate-subdomain`,
    MENU_CONSOLE: `${API_URL}/companyAdmin/company_console_menu_items`,
    ROLES_CONSOLE: `${API_URL}/companyRoutes/roles`,
    ROLES_COMP_CONSOLE: `${API_URL}/companyAdmin/roles_tenant_admin`,
    GETMENUMAPPINGCOMPANY: `${API_URL}/companyAdmin/menu-mapping-data`,
    CREATEROLE: `${API_URL}/companyRoutes/create-role`,
    TENANT_ALL_MENUS: `${API_URL}/companyAdmin/admin_tenant_menu_full`,
    GET_TENANT_ADMIN_MENU_ROLE: `${API_URL}/companyAdmin/tenant_console_menu_items_roleid`,
    ADMIN_TENANT_MENU_BY_ROLEID: `${API_URL}/companyAdmin/admin_tenant_menu_by_roleid`,
    CREATE_ROLE_TENANT_ADMIN: `${API_URL}/companyAdmin/create_role_tenant_admin`,
    EDIT_ROLE_TENANT_MENU: `${API_URL}/companyAdmin/edit_role_tenant_admin`,
    GET_USER_TENANT_ADMIN: `${API_URL}/companyAdmin/get_user_tenant_admin`,
    CREATE_USER_TENANT_ADMIN: `${API_URL}/companyAdmin/create_user_tenant_admin`,
    EDIT_USER_TENANT_MENU: `${API_URL}/companyAdmin/edit_user_tenant_admin`,
    ROLES_DROPDOWN_TENANT_ADMIN: `${API_URL}/companyAdmin/get_roles_tenant_admin_assign`,
    ROLES_PORTAL: `${API_URL}/admin/PortalData/get_roles_portal`,
    USERS_PORTAL: `${API_URL}/admin/PortalData/get_users_portal`,
    PORTAL_MENU_FULL: `${API_URL}/admin/PortalData/portal_menu_full`,
    GET_PORTAL_MENU_BY_ROLEID: `${API_URL}/admin/PortalData/portal_menu_by_roleid`,
    CREATE_PORTAL_ROLE: `${API_URL}/admin/PortalData/create_role_portal`,
    EDIT_PORTAL_ROLE: `${API_URL}/admin/PortalData/edit_role_portal`,
    PORTAL_USER_CREATE_FULL: `${API_URL}/admin/PortalData/get_user_create_setup_data`,
    CREATE_PORTAL_USER: `${API_URL}/admin/PortalData/create_user_portal`,
    EDIT_PORTAL_USER: `${API_URL}/admin/PortalData/edit_user_portal`,
    PORTAL_USER_EDIT_BY_USERID: `${API_URL}/admin/PortalData/get_user_edit_setup_data`,
    PORTAL_CO_BRANCH_SUBMENU: `${API_URL}/admin/PortalData/co_branch_submenu`,
    PORTAL_APPROVAL_LEVELS_DATA: `${API_URL}/admin/PortalData/approval_level_data_setup`,
    PORTAL_APPROVAL_LEVELS_DATA_SUBMIT: `${API_URL}/admin/PortalData/approval_level_data_setup_submit`,
    PORTAL_MENU_ITEMS: `${API_URL}/admin/PortalData/portal_menu_items`,
    PORTAL_MENU_PERMISSIONS: `${API_URL}/admin/PortalData/portal_menu_permissions`,
    PORTAL_MENU_PERMISSION_CHECK: `${API_URL}/admin/PortalData/portal_menu_permissions/check`,

    // App role <-> menu mapping (tables: role_mst, menus, role_app_menu_map)
    ROLES_APP: `${API_URL}/admin/PortalData/get_roles_app`,
    APP_MENU_FULL: `${API_URL}/admin/PortalData/app_menu_full`,
    GET_APP_MENU_BY_ROLEID: `${API_URL}/admin/PortalData/app_menu_by_roleid`,
    CREATE_ROLE_APP: `${API_URL}/admin/PortalData/create_role_app`,
    EDIT_ROLE_APP: `${API_URL}/admin/PortalData/edit_role_app`,


    ROLES_CONSOLE_CONSOLE: `${API_URL}/consoleAdmin/roles_console_admin`,
};
const apiRoutesconsole = {
    //ctrl desk and console
    ROLES_CTRLDSK: `${API_URL}/ctrldskAdmin/roles_ctrldsk_admin`,
    CREATE_ROLE_CONSOLE_ADMIN: `${API_URL}/consoleAdmin/create_role_console_admin`,
    CTRLDSK_ALL_MENUS: `${API_URL}/ctrldskAdmin/admin_ctrldsk_menu_full`,
    CREATE_ROLE_CTRLDSK_ADMIN: `${API_URL}/ctrldskAdmin/create_role_ctrldsk_admin`,
    EDIT_ROLE_CTRLDSK_MENU: `${API_URL}/ctrldskAdmin/edit_role_ctrldsk_admin`,
    ADMIN_CTRLDSK_MENU_BY_ROLEID: `${API_URL}/ctrldskAdmin/admin_ctrldsk_menu_by_roleid`,

    
    GET_USER_CTRLDSK_ADMIN: `${API_URL}/ctrldskAdmin/get_user_ctrldsk_admin`,
    EDIT_USER_CTRLDSK_MENU: `${API_URL}/ctrldskAdmin/edit_user_ctrldsk_admin`,
    ROLES_DROPDOWN_CTRLDSK_ADMIN: `${API_URL}/ctrldskAdmin/get_roles_ctrldsk_admin_assign`,
    CREATE_USER_CTRLDESK_ADMIN: `${API_URL}/ctrldskAdmin/create_user_ctrldsk_admin`,

    EDIT_USER_CTRLDESK_MENU: `${API_URL}/ctrldskAdmin/edit_user_ctrldsk_admin`,
    
    GET_ORG_ALL: `${API_URL}/ctrldskAdmin/get_org_data_all`,
    GET_ORG_BY_ID: `${API_URL}/ctrldskAdmin/get_org_data_by_id`,
    CREATE_ORG_SETUP: `${API_URL}/ctrldskAdmin/create_org_setup_data`,
    CREATE_ORG: `${API_URL}/ctrldskAdmin/create_org_data`,
    EDIT_ORG: `${API_URL}/ctrldskAdmin/edit_org_data`,



    GET_CO_ALL: `${API_URL}/companyAdmin/get_co_data_all`,
    GET_CO_BY_ID: `${API_URL}/companyAdmin/get_co_data_by_id`,
    CREATE_CO_SETUP: `${API_URL}/companyAdmin/create_co_setup_data`,
    CREATE_CO: `${API_URL}/companyAdmin/create_co_data`,
    EDIT_CO: `${API_URL}/companyAdmin/edit_co_data`,
    UPLOAD_CO_LOGO: `${API_URL}/companyAdmin/upload_co_logo`,
    GET_CO_LOGO: `${API_URL}/companyAdmin/get_co_logo`,
    DELETE_CO_LOGO: `${API_URL}/companyAdmin/delete_co_logo`,

    CO_CONFIG: `${API_URL}/companyAdmin/co_config`,
    EDIT_CO_CONFIG: `${API_URL}/companyAdmin/company_config`,


    GET_PORTAL_ALLMENU_CTRLDSK_ADMIN_BY_ID: `${API_URL}/ctrldskAdmin/portal_allmenu_details_by_id`,
    GET_PORTAL_ALLMENU_CTRLDSK_ADMIN: `${API_URL}/ctrldskAdmin/portal_allmenu_details`,
    GET_PORTAL_MENU_CTRLDSK_ADMIN: `${API_URL}/ctrldskAdmin/portal_menu_details`,
    EDIT_PORTAL_MENU_CTRLDSK_MENU: `${API_URL}/ctrldskAdmin/edit_user_ctrldsk_admin`,
    GET_PORTAL_PARENT_MENU: `${API_URL}/ctrldskAdmin/portal_parentmenudetails`,
    GET_PORTAL_MODULE_NAME: `${API_URL}/ctrldskAdmin/portalmodulename`,
    GET_PORTAL_MENU_TYPE: `${API_URL}/ctrldskAdmin/portalmenutypedetails`,     
    GET_PORTAL_MENU_NAME: `${API_URL}/ctrldskAdmin/portalmenuname`,     
    PORTAL_MENU_CREATE: `${API_URL}/ctrldskAdmin/portalmenucreate`,     
    PORTAL_MENU_EDIT: `${API_URL}/ctrldskAdmin/portalmenuedit`,     
    ORG_MODULE_MAP: `${API_URL}/ctrldskAdmin/orgmodulemapdetails`,
    ADMIN_CTRLDSK_MODULE_BY_ORGID: `${API_URL}/ctrldskAdmin/admin_ctrldsk_module_by_orgid`,
    ORGS_DROPDOWN_CTRLDSK_ADMIN: `${API_URL}/ctrldskAdmin/admin_ctrldsk_dropdown_org`,
    EDIT_ORG_MODULE_MAP_CTRLDSK: `${API_URL}/ctrldskAdmin/edit_org_module_map_ctrldesk`,

    // Portal admin user management (ctrldesk)
    GET_ORGS_DROPDOWN_PORTAL_USER: `${API_URL}/ctrldskAdmin/get_orgs_dropdown_portal_user`,
    CREATE_PORTAL_ADMIN_USER: `${API_URL}/ctrldskAdmin/create_portal_admin_user`,
    GET_PORTAL_ADMIN_USERS: `${API_URL}/ctrldskAdmin/get_portal_admin_users`,


    GET_BRANCH_ALL: `${API_URL}/companyAdmin/get_branch_data_all`,
    GET_BRANCH_BY_ID: `${API_URL}/companyAdmin/get_branch_data_by_id`,
    CREATE_BRANCH_SETUP: `${API_URL}/companyAdmin/create_branch_setup_data`,
    CREATE_BRANCH: `${API_URL}/companyAdmin/create_branch_data`,
    EDIT_BRANCH: `${API_URL}/companyAdmin/edit_branch_data`,

    GET_DEPARTMENT_ALL: `${API_URL}/companyAdmin/get_department_data_all`,
    CREATE_DEPARTMENT: `${API_URL}/companyAdmin/create_department_data`,
    EDIT_DEPARTMENT: `${API_URL}/companyAdmin/edit_department_data`,
    GET_DEPARTMENT_BY_ID: `${API_URL}/companyAdmin/get_department_data_by_id`,
    GET_SUBDEPARTMENT_ALL: `${API_URL}/companyAdmin/get_subdepartment_data_all`,

    CO_INVOICE_TYPE_MAP_SETUP: `${API_URL}/companyAdmin/co_invoice_type_map_setup`,
    CO_INVOICE_TYPE_MAP_SAVE: `${API_URL}/companyAdmin/co_invoice_type_map_save`,
};

const apiRoutesPortalMasters = {
    GET_ALL_ITEM_GRP: `${API_URL}/itemMaster/get_all_item_groups`,
    CREATE_ITEM_GRP_SETUP: `${API_URL}/itemMaster/createItemGroupSetup`,
    CREATE_ITEM_GRP: `${API_URL}/itemMaster/createItemGroup`,
    EDIT_ITEM_GRP: `${API_URL}/itemMaster/editItemGroup`,
    UPDATE_ITEM_GRP_ACTIVE: `${API_URL}/itemMaster/updateItemGroupActive`,
    ITEM_GROUP_DETAILS: `${API_URL}/itemMaster/itemGroupDetails`, // Added for details dialog
    GET_ITEM_TABLE: `${API_URL}/itemMaster/get_item_table`,
    ITEM_CREATE_SETUP: `${API_URL}/itemMaster/item_create_setup`,
    ITEM_CREATE: `${API_URL}/itemMaster/item_create`,
    ITEM_EDIT_SETUP: `${API_URL}/itemMaster/item_edit_setup`,
    ITEM_EDIT: `${API_URL}/itemMaster/item_edit`,
    ITEM_VIEW: `${API_URL}/itemMaster/item_view`,
    ITEM_MAKE_TABLE: `${API_URL}/itemMaster/item_make_table`,
    ITEM_MAKE_CREATE_SETUP: `${API_URL}/itemMaster/item_make_create_setup`,
    ITEM_MAKE_CREATE: `${API_URL}/itemMaster/item_make_create`,
    ITEM_SEARCH: `${API_URL}/itemMaster/item_search`,

        // Item BOM Master endpoints
    BOM_LIST: `${API_URL}/itemBomMaster/get_bom_list`,
    BOM_TREE: `${API_URL}/itemBomMaster/get_bom_tree`,
    BOM_CHILDREN: `${API_URL}/itemBomMaster/get_bom_children`,
    BOM_PARENTS: `${API_URL}/itemBomMaster/get_bom_parents`,
    BOM_CREATE_SETUP: `${API_URL}/itemBomMaster/bom_create_setup`,
    BOM_ADD_COMPONENT: `${API_URL}/itemBomMaster/bom_add_component`,
    BOM_EDIT_COMPONENT: `${API_URL}/itemBomMaster/bom_edit_component`,
    BOM_REMOVE_COMPONENT: `${API_URL}/itemBomMaster/bom_remove_component`,

    // BOM Costing endpoints
    BOM_COSTING_LIST: `${API_URL}/bomCosting/bom_costing_list`,
    BOM_COSTING_DETAIL: `${API_URL}/bomCosting/bom_costing_detail`,
    BOM_COSTING_CREATE_SETUP: `${API_URL}/bomCosting/bom_costing_create_setup`,
    BOM_COSTING_CREATE: `${API_URL}/bomCosting/bom_costing_create`,
    BOM_COSTING_UPDATE: `${API_URL}/bomCosting/bom_costing_update`,
    BOM_COST_ENTRY_SAVE: `${API_URL}/bomCosting/bom_cost_entry_save`,
    BOM_COST_ENTRY_BULK_SAVE: `${API_URL}/bomCosting/bom_cost_entry_bulk_save`,
    BOM_COST_ENTRY_DELETE: `${API_URL}/bomCosting/bom_cost_entry_delete`,
    BOM_COST_ROLLUP: `${API_URL}/bomCosting/bom_cost_rollup`,
    BOM_COST_SNAPSHOT_LIST: `${API_URL}/bomCosting/bom_cost_snapshot_list`,
    BOM_COST_SNAPSHOT_DETAIL: `${API_URL}/bomCosting/bom_cost_snapshot_detail`,
    BOM_COST_SUMMARY: `${API_URL}/bomCosting/bom_cost_summary`,

    // Cost Element Master endpoints
    COST_ELEMENT_TREE: `${API_URL}/bomCostElement/cost_element_tree`,
    COST_ELEMENT_LIST: `${API_URL}/bomCostElement/cost_element_list`,
    COST_ELEMENT_CREATE: `${API_URL}/bomCostElement/cost_element_create`,
    COST_ELEMENT_UPDATE: `${API_URL}/bomCostElement/cost_element_update`,
    COST_ELEMENT_TOGGLE_ACTIVE: `${API_URL}/bomCostElement/cost_element_toggle_active`,
    COST_ELEMENT_SEED: `${API_URL}/bomCostElement/cost_element_seed`,

    // Standard Rate Card endpoints
    STD_RATE_CARD_LIST: `${API_URL}/stdRateCard/std_rate_card_list`,
    STD_RATE_CARD_CURRENT: `${API_URL}/stdRateCard/std_rate_card_current`,
    STD_RATE_CARD_CREATE: `${API_URL}/stdRateCard/std_rate_card_create`,
    STD_RATE_CARD_UPDATE: `${API_URL}/stdRateCard/std_rate_card_update`,
    STD_RATE_CARD_TOGGLE_ACTIVE: `${API_URL}/stdRateCard/std_rate_card_toggle_active`,
    STD_RATE_CARD_APPLY: `${API_URL}/stdRateCard/std_rate_card_apply`,

    DEPT_MASTER_TABLE: `${API_URL}/deptMaster/dept_master_table`,
    DEPT_MASTER_VALIDATE_TABLE: `${API_URL}/deptMaster/dept_master_validate_table`,
    DEPT_MASTER_CREATE_SETUP: `${API_URL}/deptMaster/dept_master_create_setup`,
    DEPT_MASTER_CREATE: `${API_URL}/deptMaster/dept_master_create`,
    DEPT_MASTER_VIEW: `${API_URL}/deptMaster/dept_master_view`,

    SUBDEPT_MASTER_TABLE : `${API_URL}/deptMaster/subdept_master_table`,
    SUBDEPT_MASTER_CREATE_SETUP : `${API_URL}/deptMaster/subdept_master_create_setup`,
    SUBDEPT_MASTER_CREATE : `${API_URL}/deptMaster/subdept_master_create`,
    SUBDEPT_MASTER_VIEW : `${API_URL}/deptMaster/subdept_master_view`,

    MECHINE_TYPE_MASTER_TABLE : `${API_URL}/machineTypeMaster/get_machine_type_table`,
    MECHINE_TYPE_MASTER_CREATE_SETUP : `${API_URL}/machineTypeMaster/get_machine_type_by_id`,
    MECHINE_TYPE_MASTER_CREATE : `${API_URL}/machineTypeMaster/machine_type_create`,
    MECHINE_TYPE_MASTER_VIEW : `${API_URL}/machineTypeMaster/get_machine_type_by_id`,

    MECHINE_MASTER_TABLE : `${API_URL}/mechMaster/mechine_master_table`,
    MECHINE_MASTER_CREATE_SETUP : `${API_URL}/mechMaster/mechine_master_create_setup`,
    MECHINE_MASTER_CREATE : `${API_URL}/mechMaster/mechine_master_create`,
    MECHINE_MASTER_EDIT_SETUP : `${API_URL}/mechMaster/mechine_master_edit_setup`,
    MECHINE_MASTER_EDIT : `${API_URL}/mechMaster/mechine_master_edit`,
    MECHINE_MASTER_VIEW : `${API_URL}/mechMaster/mechine_master_view`,
    MECHINE_MASTER_BY_ID : `${API_URL}/mechMaster/mechine_master_by_id`
    ,
    PROJECT_MASTER_TABLE: `${API_URL}/projectMaster/project_master_table`,
    PROJECT_MASTER_CREATE_SETUP: `${API_URL}/projectMaster/project_master_create_setup`,
    PROJECT_MASTER_CREATE: `${API_URL}/projectMaster/project_master_create`,
    PROJECT_MASTER_EDIT: `${API_URL}/projectMaster/project_master_edit`,
    PROJECT_MASTER_VIEW: `${API_URL}/projectMaster/project_master_view`,


    PARTY_TABLE: `${API_URL}/partyMaster/get_party_table`,
    PARTY_CREATE_SETUP: `${API_URL}/partyMaster/party_create_setup`,
    PARTY_CREATE: `${API_URL}/partyMaster/party_create`,
    PARTY_EDIT_SETUP: `${API_URL}/partyMaster/party_edit_setup`,
    PARTY_EDIT: `${API_URL}/partyMaster/party_edit`,
    SUPPLIER_REGISTRATION_SETUP: `${API_URL}/partyMaster/supplier_registration_setup`,
    SUPPLIER_REGISTER: `${API_URL}/partyMaster/supplier_register`,

    WAREHOUSE_TABLE: `${API_URL}/warehouseMaster/get_warehouse_table`,
    WAREHOUSE_CREATE_SETUP: `${API_URL}/warehouseMaster/warehouse_create_setup`,
    WAREHOUSE_CREATE: `${API_URL}/warehouseMaster/warehouse_create`,
    WAREHOUSE_EDIT_SETUP: `${API_URL}/warehouseMaster/warehouse_edit_setup`,
    WAREHOUSE_EDIT: `${API_URL}/warehouseMaster/warehouse_edit`,

    COSTFACTOR_TABLE: `${API_URL}/costFactorMaster/get_cost_factor_table`,
    COSTFACTOR_CREATE_SETUP: `${API_URL}/costFactorMaster/cost_factor_create_setup`,
    COSTFACTOR_CREATE: `${API_URL}/costFactorMaster/cost_factor_create`,
    COSTFACTOR_EDIT_SETUP: `${API_URL}/costFactorMaster/cost_factor_edit_setup`,
    COSTFACTOR_EDIT: `${API_URL}/costFactorMaster/cost_factor_edit`,

    JUTE_QUALITY_TABLE: `${API_URL}/juteQualityMaster/get_jute_quality_table`,
    JUTE_QUALITY_BY_ID: `${API_URL}/juteQualityMaster/get_jute_quality_by_id`,
    JUTE_QUALITY_CREATE_SETUP: `${API_URL}/juteQualityMaster/jute_quality_create_setup`,
    JUTE_QUALITY_EDIT_SETUP: `${API_URL}/juteQualityMaster/jute_quality_edit_setup`,
    JUTE_QUALITY_CREATE: `${API_URL}/juteQualityMaster/jute_quality_create`,
    JUTE_QUALITY_EDIT: `${API_URL}/juteQualityMaster/jute_quality_edit`,

    // Jute Supplier Master endpoints (global - not company-specific)
    JUTE_SUPPLIER_TABLE: `${API_URL}/juteSupplierMaster/get_jute_supplier_table`,
    JUTE_SUPPLIER_BY_ID: `${API_URL}/juteSupplierMaster/get_jute_supplier_by_id`,
    JUTE_SUPPLIER_EDIT_SETUP: `${API_URL}/juteSupplierMaster/jute_supplier_edit_setup`,
    JUTE_SUPPLIER_CREATE: `${API_URL}/juteSupplierMaster/jute_supplier_create`,
    JUTE_SUPPLIER_EDIT: `${API_URL}/juteSupplierMaster/jute_supplier_edit`,

    // Jute Supplier Map endpoints (company-specific mappings)
    JUTE_SUPPLIER_MAP_TABLE: `${API_URL}/juteSupplierMap/get_jute_supplier_map_table`,
    JUTE_SUPPLIER_MAP_BY_ID: `${API_URL}/juteSupplierMap/get_jute_supplier_map_by_id`,
    JUTE_SUPPLIER_MAP_CREATE_SETUP: `${API_URL}/juteSupplierMap/jute_supplier_map_create_setup`,
    JUTE_SUPPLIER_MAP_AVAILABLE_PARTIES: `${API_URL}/juteSupplierMap/get_available_parties_for_supplier`,
    JUTE_SUPPLIER_MAP_CREATE: `${API_URL}/juteSupplierMap/jute_supplier_map_create`,
    JUTE_SUPPLIER_MAP_DELETE: `${API_URL}/juteSupplierMap/jute_supplier_map_delete`,

    // Jute Agent Map endpoints (agent branch to party branch mappings)
    JUTE_AGENT_MAP_TABLE: `${API_URL}/juteAgentMap/get_jute_agent_map_table`,
    JUTE_AGENT_MAP_BY_ID: `${API_URL}/juteAgentMap/get_jute_agent_map_by_id`,
    JUTE_AGENT_MAP_CREATE_SETUP: `${API_URL}/juteAgentMap/jute_agent_map_create_setup`,
    JUTE_AGENT_MAP_PARTY_BRANCHES: `${API_URL}/juteAgentMap/get_party_branches_for_agent`,
    JUTE_AGENT_MAP_CREATE: `${API_URL}/juteAgentMap/jute_agent_map_create`,
    JUTE_AGENT_MAP_DELETE: `${API_URL}/juteAgentMap/jute_agent_map_delete`,

    // Yarn Quality Master endpoints
    YARN_QUALITY_TABLE: `${API_URL}/yarnQualityMaster/yarn_quality_table`,
    YARN_QUALITY_CREATE_SETUP: `${API_URL}/yarnQualityMaster/yarn_quality_create_setup`,
    YARN_QUALITY_EDIT_SETUP: `${API_URL}/yarnQualityMaster/yarn_quality_edit_setup`,
    YARN_QUALITY_CREATE: `${API_URL}/yarnQualityMaster/yarn_quality_create`,
    YARN_QUALITY_EDIT: `${API_URL}/yarnQualityMaster/yarn_quality_edit`,

    // Spinning Quality Master endpoints
    SPINNING_QUALITY_TABLE: `${API_URL}/spinningQualityMaster/spinning_quality_table`,
    SPINNING_QUALITY_CREATE_SETUP: `${API_URL}/spinningQualityMaster/spinning_quality_create_setup`,
    SPINNING_QUALITY_EDIT_SETUP: `${API_URL}/spinningQualityMaster/spinning_quality_edit_setup`,
    SPINNING_QUALITY_CREATE: `${API_URL}/spinningQualityMaster/spinning_quality_create`,
    SPINNING_QUALITY_EDIT: `${API_URL}/spinningQualityMaster/spinning_quality_edit`,

    // Trolly Master endpoints
    TROLLY_TABLE: `${API_URL}/trollyMaster/trolly_table`,
    TROLLY_CREATE_SETUP: `${API_URL}/trollyMaster/trolly_create_setup`,
    TROLLY_EDIT_SETUP: `${API_URL}/trollyMaster/trolly_edit_setup`,
    TROLLY_CREATE: `${API_URL}/trollyMaster/trolly_create`,
    TROLLY_EDIT: `${API_URL}/trollyMaster/trolly_edit`,

    // Machine SPG Details Master endpoints
    MACHINE_SPG_DETAILS_TABLE: `${API_URL}/machineSpgDetailsMaster/machine_spg_details_table`,
    MACHINE_SPG_DETAILS_CREATE_SETUP: `${API_URL}/machineSpgDetailsMaster/machine_spg_details_create_setup`,
    MACHINE_SPG_DETAILS_MACHINES_BY_BRANCH: `${API_URL}/machineSpgDetailsMaster/get_machines_by_branch`,
    MACHINE_SPG_DETAILS_EDIT_SETUP: `${API_URL}/machineSpgDetailsMaster/machine_spg_details_edit_setup`,
    MACHINE_SPG_DETAILS_CREATE: `${API_URL}/machineSpgDetailsMaster/machine_spg_details_create`,
    MACHINE_SPG_DETAILS_EDIT: `${API_URL}/machineSpgDetailsMaster/machine_spg_details_edit`,
    // Yarn Type Master endpoints
    YARN_TYPE_TABLE: `${API_URL}/yarnTypeMaster/get_yarn_type_table`,
    YARN_TYPE_BY_ID: `${API_URL}/yarnTypeMaster/get_yarn_type_by_id`,
    YARN_TYPE_EDIT_SETUP: `${API_URL}/yarnTypeMaster/yarn_type_edit_setup`,
    YARN_TYPE_CREATE: `${API_URL}/yarnTypeMaster/yarn_type_create`,
    YARN_TYPE_EDIT: `${API_URL}/yarnTypeMaster/yarn_type_edit`,

    // Jute Mukam Master endpoints (jute_mukam_mst - global, not company-specific)
    JUTE_MUKAM_TABLE: `${API_URL}/juteMukamMaster/get_jute_mukam_table`,
    JUTE_MUKAM_BY_ID: `${API_URL}/juteMukamMaster/get_jute_mukam_by_id`,
    JUTE_MUKAM_EDIT_SETUP: `${API_URL}/juteMukamMaster/jute_mukam_edit_setup`,
    JUTE_MUKAM_CREATE: `${API_URL}/juteMukamMaster/jute_mukam_create`,
    JUTE_MUKAM_EDIT: `${API_URL}/juteMukamMaster/jute_mukam_edit`,

    // Yarn Master endpoints (jute_yarn_mst)
    YARN_TABLE: `${API_URL}/yarnMaster/get_yarn_table`,
    YARN_BY_ID: `${API_URL}/yarnMaster/get_yarn_by_id`,
    YARN_CREATE_SETUP: `${API_URL}/yarnMaster/yarn_create_setup`,
    YARN_EDIT_SETUP: `${API_URL}/yarnMaster/yarn_edit_setup`,
    YARN_CREATE: `${API_URL}/yarnMaster/yarn_create`,
    YARN_EDIT: `${API_URL}/yarnMaster/yarn_edit`,

    // Batch Plan Master endpoints (jute_batch_plan)
    BATCH_PLAN_TABLE: `${API_URL}/batchPlanMaster/get_batch_plan_table`,
    BATCH_PLAN_BY_ID: `${API_URL}/batchPlanMaster/get_batch_plan_by_id`,
    BATCH_PLAN_CREATE_SETUP: `${API_URL}/batchPlanMaster/batch_plan_create_setup`,
    BATCH_PLAN_EDIT_SETUP: `${API_URL}/batchPlanMaster/batch_plan_edit_setup`,
    BATCH_PLAN_CREATE: `${API_URL}/batchPlanMaster/batch_plan_create`,
    BATCH_PLAN_EDIT: `${API_URL}/batchPlanMaster/batch_plan_edit`,
    BATCH_PLAN_QUALITIES_FOR_ITEM: `${API_URL}/batchPlanMaster/get_qualities_for_item`,

    // Jute PO endpoints
    JUTE_PO_TABLE: `${API_URL}/jutePO/get_jute_po_table`,
    JUTE_PO_BY_ID: `${API_URL}/jutePO/get_jute_po_by_id`,
    JUTE_PO_LINE_ITEMS: `${API_URL}/jutePO/get_jute_po_line_items`,
    JUTE_PO_CREATE_SETUP: `${API_URL}/jutePO/jute_po_create_setup`,
    JUTE_PO_SUPPLIERS_BY_MUKAM: `${API_URL}/jutePO/get_suppliers_by_mukam`,
    JUTE_PO_PARTIES_BY_SUPPLIER: `${API_URL}/jutePO/get_parties_by_supplier`,
    JUTE_PO_QUALITIES_BY_ITEM: `${API_URL}/jutePO/get_qualities_by_item`,
    JUTE_PO_CREATE: `${API_URL}/jutePO/jute_po_create`,
    JUTE_PO_UPDATE: `${API_URL}/jutePO/jute_po_update`,
    JUTE_PO_OPEN: `${API_URL}/jutePO/open_jute_po`,
    JUTE_PO_APPROVE: `${API_URL}/jutePO/approve_jute_po`,
    JUTE_PO_REJECT: `${API_URL}/jutePO/reject_jute_po`,
    JUTE_PO_CANCEL_DRAFT: `${API_URL}/jutePO/cancel_draft_jute_po`,
    JUTE_PO_REOPEN: `${API_URL}/jutePO/reopen_jute_po`,

    // Jute Gate Entry endpoints
    JUTE_GATE_ENTRY_TABLE: `${API_URL}/juteGateEntry/get_jute_gate_entry_table`,
    JUTE_GATE_ENTRY_BY_ID: `${API_URL}/juteGateEntry/get_jute_gate_entry_by_id`,
    JUTE_GATE_ENTRY_CREATE_SETUP: `${API_URL}/juteGateEntry/jute_gate_entry_create_setup`,
    JUTE_GATE_ENTRY_CREATE: `${API_URL}/juteGateEntry/jute_gate_entry_create`,
    JUTE_GATE_ENTRY_UPDATE: `${API_URL}/juteGateEntry/jute_gate_entry_update`,
    JUTE_GATE_ENTRY_PARTIES_BY_SUPPLIER: `${API_URL}/juteGateEntry/get_parties_by_supplier`,
    JUTE_GATE_ENTRY_QUALITIES_BY_ITEM: `${API_URL}/juteGateEntry/get_qualities_by_item`,
    JUTE_GATE_ENTRY_PO_DETAILS: `${API_URL}/juteGateEntry/get_po_details`,

    // Jute Material Inspection endpoints
    JUTE_MATERIAL_INSPECTION_TABLE: `${API_URL}/juteMaterialInspection/get_inspection_table`,
    JUTE_MATERIAL_INSPECTION_BY_ID: `${API_URL}/juteMaterialInspection/get_inspection_by_id`,
    JUTE_MATERIAL_INSPECTION_SETUP: `${API_URL}/juteMaterialInspection/get_inspection_setup`,
    JUTE_MATERIAL_INSPECTION_QUALITIES: `${API_URL}/juteMaterialInspection/get_qualities_by_item`,
    JUTE_MATERIAL_INSPECTION_COMPLETE: `${API_URL}/juteMaterialInspection/complete_inspection`,
    JUTE_MATERIAL_INSPECTION_MR_LINE: `${API_URL}/juteMaterialInspection/get_mr_line_item`,
    JUTE_MATERIAL_INSPECTION_SAVE_MOISTURE: `${API_URL}/juteMaterialInspection/save_moisture_readings`,

    // Jute MR endpoints
    JUTE_MR_TABLE: `${API_URL}/juteMR/get_mr_table`,
    JUTE_MR_BY_ID: `${API_URL}/juteMR/get_mr_by_id`,
    JUTE_MR_UPDATE: `${API_URL}/juteMR/update_mr`,
    JUTE_MR_AGENT_OPTIONS: `${API_URL}/juteMR/get_agent_options`,
    JUTE_MR_WAREHOUSE_OPTIONS: `${API_URL}/juteMR/get_warehouse_options`,
    JUTE_MR_PARTY_BRANCHES: `${API_URL}/juteMR/get_party_branches`,
    JUTE_MR_OPEN_POS: `${API_URL}/juteMR/get_open_pos`,
    JUTE_MR_SUPPLIERS: `${API_URL}/juteMR/get_suppliers`,
    JUTE_MR_PARTIES: `${API_URL}/juteMR/get_parties`,
    JUTE_MR_OPEN: `${API_URL}/juteMR/open_mr`,
    JUTE_MR_PENDING: `${API_URL}/juteMR/pending_mr`,
    JUTE_MR_APPROVE: `${API_URL}/juteMR/approve_mr`,
    JUTE_MR_REJECT: `${API_URL}/juteMR/reject_mr`,
    JUTE_MR_CANCEL: `${API_URL}/juteMR/cancel_mr`,
    JUTE_MATERIAL_INSPECTION_UPDATE_LINE: `${API_URL}/juteMaterialInspection/update_line_item`,

    // Jute Bill Pass endpoints
    JUTE_BILL_PASS_TABLE: `${API_URL}/juteBillPass/get_bill_pass_list`,
    JUTE_BILL_PASS_BY_ID: `${API_URL}/juteBillPass/get_bill_pass_by_id`,
    JUTE_BILL_PASS_LINE_ITEMS: `${API_URL}/juteBillPass/get_bill_pass_line_items`,
    JUTE_BILL_PASS_UPDATE: `${API_URL}/juteBillPass/update_bill_pass`,

    // Jute Issue endpoints
    JUTE_ISSUE_TABLE: `${API_URL}/juteIssue/get_issue_table`,
    JUTE_ISSUE_BY_ID: `${API_URL}/juteIssue/get_issue_by_id`,
    JUTE_ISSUE_CREATE_SETUP: `${API_URL}/juteIssue/get_issue_create_setup`,
    JUTE_ISSUE_STOCK_OUTSTANDING: `${API_URL}/juteIssue/get_stock_outstanding`,
    JUTE_ISSUES_BY_DATE: `${API_URL}/juteIssue/get_issues_by_date`,
    JUTE_ISSUE_MAX_DATE: `${API_URL}/juteIssue/get_max_issue_date`,
    JUTE_ISSUE_CREATE: `${API_URL}/juteIssue/create_issue`,
    JUTE_ISSUE_UPDATE: `${API_URL}/juteIssue/update_issue`,
    JUTE_ISSUE_DELETE: `${API_URL}/juteIssue/delete_issue`,
    JUTE_ISSUE_OPEN: `${API_URL}/juteIssue/open_issues`,
    JUTE_ISSUE_APPROVE: `${API_URL}/juteIssue/approve_issues`,
    JUTE_ISSUE_REJECT: `${API_URL}/juteIssue/reject_issues`,

    // Batch Daily Assign
    BATCH_DAILY_ASSIGN_TABLE: `${API_URL}/batchDailyAssign/get_assign_table`,
    BATCH_DAILY_ASSIGN_BY_DATE: `${API_URL}/batchDailyAssign/get_assigns_by_date`,
    BATCH_DAILY_ASSIGN_CREATE_SETUP: `${API_URL}/batchDailyAssign/get_assign_create_setup`,
    BATCH_DAILY_ASSIGN_MAX_DATE: `${API_URL}/batchDailyAssign/get_max_assign_date`,
    BATCH_DAILY_ASSIGN_CREATE: `${API_URL}/batchDailyAssign/create_assign`,
    BATCH_DAILY_ASSIGN_DELETE: `${API_URL}/batchDailyAssign/delete_assign`,
    BATCH_DAILY_ASSIGN_OPEN: `${API_URL}/batchDailyAssign/open_assigns`,
    BATCH_DAILY_ASSIGN_APPROVE: `${API_URL}/batchDailyAssign/approve_assigns`,
    BATCH_DAILY_ASSIGN_REJECT: `${API_URL}/batchDailyAssign/reject_assigns`,

    // Jute Reports
    JUTE_REPORT_STOCK: `${API_URL}/juteReports/stock`,
    JUTE_REPORT_BATCH_COST: `${API_URL}/juteReports/batch-cost`,
    JUTE_REPORT_SUMMARY: `${API_URL}/juteReports/summary`,
    JUTE_REPORT_DETAILS: `${API_URL}/juteReports/details`,

    // Spreader (Production) Reports
    SPREADER_REPORT_SUMMARY: `${API_URL}/spreaderReports/summary`,
    SPREADER_REPORT_DATE_PRODUCTION: `${API_URL}/spreaderReports/date-production`,
    SPREADER_REPORT_DATE_ISSUE: `${API_URL}/spreaderReports/date-issue`,
    SPREADER_REPORT_QUALITY_DETAILS: `${API_URL}/spreaderReports/quality-details`,

    // Drawing (Production) Reports
    DRAWING_REPORT_SUMMARY: `${API_URL}/drawingReports/summary`,
    DRAWING_REPORT_DATE_PRODUCTION: `${API_URL}/drawingReports/date-production`,
    DRAWING_REPORT_DATE_ISSUE: `${API_URL}/drawingReports/date-issue`,
    DRAWING_REPORT_QUALITY_DETAILS: `${API_URL}/drawingReports/quality-details`,
    DRAWING_REPORT_SHIFT_MATRIX: `${API_URL}/drawingReports/shift-matrix`,

    // Spinning (Production) Reports
    SPINNING_REPORT_PRODUCTION_EFF: `${API_URL}/spinningReports/production-eff`,
    SPINNING_REPORT_MC_DATE: `${API_URL}/spinningReports/mc-date`,
    SPINNING_REPORT_EMP_DATE: `${API_URL}/spinningReports/emp-date`,
    SPINNING_REPORT_FRAME_RUNNING: `${API_URL}/spinningReports/frame-running`,
    SPINNING_REPORT_RUNNING_HOURS_EFF: `${API_URL}/spinningReports/running-hours-eff`,
    SPINNING_EMP_BRK_REPORT_DETAIL: `${API_URL}/spinningEmpBrkReports/detail`,

    // Winding (Production) Reports
    WINDING_REPORT_DAY_WISE: `${API_URL}/windingReports/day-wise`,
    WINDING_REPORT_FN_WISE: `${API_URL}/windingReports/fn-wise`,
    WINDING_REPORT_MONTH_WISE: `${API_URL}/windingReports/month-wise`,
    WINDING_REPORT_DAILY: `${API_URL}/windingReports/daily`,

    // Other Entries (Production) Reports
    OTHER_REPORT_ENTRIES: `${API_URL}/otherReports/entries`,

    // Bales (Production) Reports
    BALES_REPORT_ENTRIES: `${API_URL}/balesReports/entries`,

    // Jute SQC - Morrah Weight QC
    MORRAH_WT_TABLE: `${API_URL}/juteSQC/get_morrah_wt_table`,
    MORRAH_WT_BY_ID: `${API_URL}/juteSQC/get_morrah_wt_by_id`,
    MORRAH_WT_CREATE_SETUP: `${API_URL}/juteSQC/get_morrah_wt_create_setup`,
    MORRAH_WT_CREATE: `${API_URL}/juteSQC/create_morrah_wt`,

    GET_INDENT_SETUP_1: `${API_URL}/procurementIndent/get_indent_setup_1`,
    GET_INDENT_SETUP_2: `${API_URL}/procurementIndent/get_indent_setup_2`,
    INDENT_CREATE: `${API_URL}/procurementIndent/create_indent`,
    INDENT_UPDATE: `${API_URL}/procurementIndent/update_indent`,
    INDENT_TABLE: `${API_URL}/procurementIndent/get_indent_table`,
    GET_INDENT_BY_ID: `${API_URL}/procurementIndent/get_indent_by_id`,
    GET_ALL_APPROVED_INDENTS: `${API_URL}/procurementIndent/get_all_approved_indents`,
    GET_APPROVAL_FLOW: `${API_URL}/procurementIndent/get_approval_flow`,
    INDENT_APPROVE: `${API_URL}/procurementIndent/approve_indent`,
    INDENT_APPROVE_WITH_VALUE: `${API_URL}/procurementIndent/approve_indent_with_value`,
    INDENT_OPEN: `${API_URL}/procurementIndent/open_indent`,
    INDENT_CANCEL_DRAFT: `${API_URL}/procurementIndent/cancel_draft_indent`,
    INDENT_REOPEN: `${API_URL}/procurementIndent/reopen_indent`,
    INDENT_SEND_FOR_APPROVAL: `${API_URL}/procurementIndent/send_indent_for_approval`,
    INDENT_REJECT: `${API_URL}/procurementIndent/reject_indent`,
    VALIDATE_ITEM_FOR_INDENT: `${API_URL}/procurementIndent/validate_item_for_indent`,
    GET_INDENT_LINES_BY_TITLE: `${API_URL}/procurementIndent/get_indent_lines_by_title`,
    PO_TABLE: `${API_URL}/procurementPO/get_po_table`,
    GET_PO_SETUP_1: `${API_URL}/procurementPO/get_po_setup_1`,
    GET_PO_SETUP_2: `${API_URL}/procurementPO/get_po_setup_2`,
    GET_INDENT_LINE_ITEMS: `${API_URL}/procurementPO/get_indent_line_items`,
    GET_SUPPLIER_BRANCHES: `${API_URL}/procurementPO/get_supplier_branches`,
    PO_CREATE: `${API_URL}/procurementPO/create_po`,
    PO_SAVE: `${API_URL}/procurementPO/save_po`,
    PO_UPDATE: `${API_URL}/procurementPO/update_po`,
    GET_PO_BY_ID: `${API_URL}/procurementPO/get_po_by_id`,
    PO_APPROVE: `${API_URL}/procurementPO/approve_po`,
    PO_OPEN: `${API_URL}/procurementPO/open_po`,
    PO_CANCEL_DRAFT: `${API_URL}/procurementPO/cancel_draft_po`,
    PO_REOPEN: `${API_URL}/procurementPO/reopen_po`,
    PO_SEND_FOR_APPROVAL: `${API_URL}/procurementPO/send_po_for_approval`,
    PO_REJECT: `${API_URL}/procurementPO/reject_po`,
    PO_CLONE: `${API_URL}/procurementPO/clone_po`,
    PO_VALIDATE_ITEM: `${API_URL}/procurementPO/validate_item_for_po`,

    INWARD_TABLE: `${API_URL}/procurementInward/get_inward_table`,
    GET_INWARD_SETUP_1: `${API_URL}/procurementInward/get_inward_setup_1`,
    GET_INWARD_SETUP_2: `${API_URL}/procurementInward/get_inward_setup_2`,
    GET_APPROVED_POS_BY_SUPPLIER: `${API_URL}/procurementInward/get_approved_pos_by_supplier`,
    GET_PO_LINE_ITEMS_FOR_INWARD: `${API_URL}/procurementInward/get_po_line_items`,
    INWARD_CREATE: `${API_URL}/procurementInward/create_inward`,
    INWARD_UPDATE: `${API_URL}/procurementInward/update_inward`,
    GET_INWARD_BY_ID: `${API_URL}/procurementInward/get_inward_by_id`,
    INWARD_CANCEL: `${API_URL}/procurementInward/cancel_inward`,

    // Material Inspection endpoints
    INSPECTION_PENDING_LIST: `${API_URL}/materialInspection/get_pending_inspection_list`,
    INSPECTION_GET_BY_INWARD_ID: `${API_URL}/materialInspection/get_inspection_by_inward_id`,
    INSPECTION_COMPLETE: `${API_URL}/materialInspection/complete_inspection`,

    // Stores Receipt (SR) endpoints
    SR_PENDING_LIST: `${API_URL}/storesReceipt/get_sr_pending_list`,
    SR_GET_BY_INWARD_ID: `${API_URL}/storesReceipt/get_sr_by_inward_id`,
    SR_SETUP: `${API_URL}/storesReceipt/get_sr_setup`,
    SR_SAVE: `${API_URL}/storesReceipt/save_sr`,
    SR_OPEN: `${API_URL}/storesReceipt/open_sr`,
    SR_APPROVE: `${API_URL}/storesReceipt/approve_sr`,
    SR_REJECT: `${API_URL}/storesReceipt/reject_sr`,

    // DRCR Note endpoints
    DRCR_NOTE_LIST: `${API_URL}/drcrNote/get_drcr_note_list`,
    DRCR_NOTE_GET_BY_ID: `${API_URL}/drcrNote/get_drcr_note_by_id`,
    DRCR_NOTE_CREATE: `${API_URL}/drcrNote/create_drcr_note`,
    DRCR_NOTE_OPEN: `${API_URL}/drcrNote/open_drcr_note`,
    DRCR_NOTE_APPROVE: `${API_URL}/drcrNote/approve_drcr_note`,
    DRCR_NOTE_REJECT: `${API_URL}/drcrNote/reject_drcr_note`,
    DRCR_NOTE_GET_INWARD_FOR_CREATE: `${API_URL}/drcrNote/get_inward_for_drcr_note`,

    // Bill Pass endpoints
    BILL_PASS_LIST: `${API_URL}/billPass/get_bill_pass_list`,
    BILL_PASS_GET_BY_ID: `${API_URL}/billPass/get_bill_pass_by_id`,
    BILL_PASS_UPDATE: `${API_URL}/billPass/update_bill_pass`,

    // Inventory Issue endpoints
    ISSUE_TABLE: `${API_URL}/inventoryIssue/get_issue_table`,
    ISSUE_GET_BY_ID: `${API_URL}/inventoryIssue/get_issue_by_id`,
    ISSUE_SETUP_1: `${API_URL}/inventoryIssue/get_issue_setup_1`,
    ISSUE_CREATE: `${API_URL}/inventoryIssue/create_issue`,
    ISSUE_UPDATE: `${API_URL}/inventoryIssue/update_issue`,
    ISSUE_UPDATE_STATUS: `${API_URL}/inventoryIssue/update_issue_status`,
    ISSUE_AVAILABLE_INVENTORY: `${API_URL}/inventoryIssue/get_available_inventory`,
    ISSUE_INVENTORY_LIST: `${API_URL}/inventoryIssue/get_inventory_list`,
    ISSUE_COST_FACTORS: `${API_URL}/inventoryIssue/get_cost_factors`,
    ISSUE_MACHINES: `${API_URL}/inventoryIssue/get_machines`,

    // Sales Quotation endpoints
    QUOTATION_TABLE: `${API_URL}/salesQuotation/get_quotation_table`,
    QUOTATION_SETUP_1: `${API_URL}/salesQuotation/get_quotation_setup_1`,
    QUOTATION_SETUP_2: `${API_URL}/salesQuotation/get_quotation_setup_2`,
    QUOTATION_GET_BY_ID: `${API_URL}/salesQuotation/get_quotation_by_id`,
    QUOTATION_CREATE: `${API_URL}/salesQuotation/create_quotation`,
    QUOTATION_UPDATE: `${API_URL}/salesQuotation/update_quotation`,
    QUOTATION_OPEN: `${API_URL}/salesQuotation/open_quotation`,
    QUOTATION_CANCEL_DRAFT: `${API_URL}/salesQuotation/cancel_draft_quotation`,
    QUOTATION_SEND_FOR_APPROVAL: `${API_URL}/salesQuotation/send_quotation_for_approval`,
    QUOTATION_APPROVE: `${API_URL}/salesQuotation/approve_quotation`,
    QUOTATION_REJECT: `${API_URL}/salesQuotation/reject_quotation`,
    QUOTATION_REOPEN: `${API_URL}/salesQuotation/reopen_quotation`,

    // Sales Order endpoints
    SALES_ORDER_TABLE: `${API_URL}/salesOrder/get_sales_order_table`,
    SALES_ORDER_BY_ID: `${API_URL}/salesOrder/get_sales_order_by_id`,
    SALES_ORDER_SETUP_1: `${API_URL}/salesOrder/get_sales_order_setup_1`,
    SALES_ORDER_SETUP_2: `${API_URL}/salesOrder/get_sales_order_setup_2`,
    SALES_ORDER_QUOTATION_LINES: `${API_URL}/salesOrder/get_quotation_lines`,
    SALES_ORDER_CREATE: `${API_URL}/salesOrder/create_sales_order`,
    SALES_ORDER_UPDATE: `${API_URL}/salesOrder/update_sales_order`,
    SALES_ORDER_OPEN: `${API_URL}/salesOrder/open_sales_order`,
    SALES_ORDER_CANCEL_DRAFT: `${API_URL}/salesOrder/cancel_draft_sales_order`,
    SALES_ORDER_SEND_FOR_APPROVAL: `${API_URL}/salesOrder/send_sales_order_for_approval`,
    SALES_ORDER_APPROVE: `${API_URL}/salesOrder/approve_sales_order`,
    SALES_ORDER_REJECT: `${API_URL}/salesOrder/reject_sales_order`,
    SALES_ORDER_REOPEN: `${API_URL}/salesOrder/reopen_sales_order`,

    // Sales Delivery Order endpoints
    DELIVERY_ORDER_TABLE: `${API_URL}/salesDeliveryOrder/get_delivery_order_table`,
    DELIVERY_ORDER_SETUP_1: `${API_URL}/salesDeliveryOrder/get_delivery_order_setup_1`,
    DELIVERY_ORDER_SETUP_2: `${API_URL}/salesDeliveryOrder/get_delivery_order_setup_2`,
    DELIVERY_ORDER_SALES_ORDER_LINES: `${API_URL}/salesDeliveryOrder/get_sales_order_lines`,
    DELIVERY_ORDER_GET_BY_ID: `${API_URL}/salesDeliveryOrder/get_delivery_order_by_id`,
    DELIVERY_ORDER_CREATE: `${API_URL}/salesDeliveryOrder/create_delivery_order`,
    DELIVERY_ORDER_UPDATE: `${API_URL}/salesDeliveryOrder/update_delivery_order`,
    DELIVERY_ORDER_OPEN: `${API_URL}/salesDeliveryOrder/open_delivery_order`,
    DELIVERY_ORDER_CANCEL_DRAFT: `${API_URL}/salesDeliveryOrder/cancel_draft_delivery_order`,
    DELIVERY_ORDER_SEND_FOR_APPROVAL: `${API_URL}/salesDeliveryOrder/send_delivery_order_for_approval`,
    DELIVERY_ORDER_APPROVE: `${API_URL}/salesDeliveryOrder/approve_delivery_order`,
    DELIVERY_ORDER_REJECT: `${API_URL}/salesDeliveryOrder/reject_delivery_order`,
    DELIVERY_ORDER_REOPEN: `${API_URL}/salesDeliveryOrder/reopen_delivery_order`,

    // Sales Invoice endpoints
    SALES_INVOICE_TABLE: `${API_URL}/salesInvoice/get_sales_invoice_table`,
    SALES_INVOICE_BY_ID: `${API_URL}/salesInvoice/get_sales_invoice_by_id`,
    SALES_INVOICE_SETUP_1: `${API_URL}/salesInvoice/get_sales_invoice_setup_1`,
    SALES_INVOICE_SETUP_2: `${API_URL}/salesInvoice/get_sales_invoice_setup_2`,
    SALES_INVOICE_DELIVERY_ORDER_LINES: `${API_URL}/salesInvoice/get_delivery_order_lines`,
    SALES_INVOICE_SALES_ORDER_LINES: `${API_URL}/salesInvoice/get_sales_order_lines`,
    SALES_INVOICE_CREATE: `${API_URL}/salesInvoice/create_sales_invoice`,
    SALES_INVOICE_UPDATE: `${API_URL}/salesInvoice/update_sales_invoice`,
    SALES_INVOICE_OPEN: `${API_URL}/salesInvoice/open_sales_invoice`,
    SALES_INVOICE_CANCEL_DRAFT: `${API_URL}/salesInvoice/cancel_draft_sales_invoice`,
    SALES_INVOICE_SEND_FOR_APPROVAL: `${API_URL}/salesInvoice/send_sales_invoice_for_approval`,
    SALES_INVOICE_APPROVE: `${API_URL}/salesInvoice/approve_sales_invoice`,
    SALES_INVOICE_REJECT: `${API_URL}/salesInvoice/reject_sales_invoice`,
    SALES_INVOICE_REOPEN: `${API_URL}/salesInvoice/reopen_sales_invoice`,
    SALES_INVOICE_TRANSPORTER_BRANCHES: `${API_URL}/salesInvoice/get_transporter_branches`,

    // HRMS Employee endpoints
    HRMS_EMPLOYEE_LIST: `${API_URL}/hrms/employee_list`,
    HRMS_EMPLOYEE_BY_ID: `${API_URL}/hrms/employee_by_id`,
    HRMS_EMPLOYEE_CREATE_SETUP: `${API_URL}/hrms/employee_create_setup`,
    HRMS_DESIGNATIONS_BY_BRANCH: `${API_URL}/hrms/get_designations_by_branch`,
    HRMS_DESIGNATIONS_BY_SUB_DEPT: `${API_URL}/hrms/get_designations_by_sub_dept`,
    HRMS_EMPLOYEE_CREATE: `${API_URL}/hrms/employee_create`,
    HRMS_EMPLOYEE_SECTION_SAVE: `${API_URL}/hrms/employee_section_save`,
    HRMS_EMPLOYEE_PROGRESS: `${API_URL}/hrms/employee_progress`,
    HRMS_EMPLOYEE_PHOTO_UPLOAD: `${API_URL}/hrms/employee_photo_upload`,
    HRMS_EMPLOYEE_PHOTO: `${API_URL}/hrms/employee_photo`,
    HRMS_EMPLOYEE_LOOKUP_BY_CODE: `${API_URL}/hrms/employee_lookup_by_code`,
    HRMS_CHECK_EMP_CODE_DUPLICATE: `${API_URL}/hrms/check_emp_code_duplicate`,
    HRMS_EMPLOYEE_STATUS_UPDATE: `${API_URL}/hrms/employee_status_update`,

    // HRMS Pay Scheme endpoints
    HRMS_PAY_SCHEME_LIST: `${API_URL}/hrms/pay_scheme_list`,
    HRMS_PAY_SCHEME_BY_ID: `${API_URL}/hrms/pay_scheme_by_id`,
    HRMS_PAY_SCHEME_CREATE_SETUP: `${API_URL}/hrms/pay_scheme_create_setup`,
    HRMS_PAY_SCHEME_CREATE: `${API_URL}/hrms/pay_scheme_create`,
    HRMS_PAY_SCHEME_UPDATE: `${API_URL}/hrms/pay_scheme_update`,

    // HRMS Pay Component endpoints
    HRMS_PAY_COMPONENT_LIST: `${API_URL}/hrms/pay_component_list`,
    HRMS_PAY_COMPONENT_BY_ID: `${API_URL}/hrms/pay_component_by_id`,
    HRMS_PAY_COMPONENT_CREATE_SETUP: `${API_URL}/hrms/pay_component_create_setup`,
    HRMS_PAY_COMPONENT_CREATE: `${API_URL}/hrms/pay_component_create`,
    HRMS_PAY_COMPONENT_UPDATE: `${API_URL}/hrms/pay_component_update`,

    // HRMS Pay Param / Period endpoints
    HRMS_PAY_PARAM_LIST: `${API_URL}/hrms/pay_param_list`,
    HRMS_PAY_PARAM_CREATE_SETUP: `${API_URL}/hrms/pay_param_create_setup`,
    HRMS_PAY_PARAM_CREATE: `${API_URL}/hrms/pay_param_create`,
    HRMS_PAY_PARAM_UPDATE: `${API_URL}/hrms/pay_param_update`,

    // HRMS Pay Register endpoints
    HRMS_PAY_REGISTER_LIST: `${API_URL}/hrms/pay_register_list`,
    HRMS_PAY_REGISTER_BY_ID: `${API_URL}/hrms/pay_register_by_id`,
    HRMS_PAY_REGISTER_CREATE_SETUP: `${API_URL}/hrms/pay_register_create_setup`,
    HRMS_PAY_REGISTER_CREATE: `${API_URL}/hrms/pay_register_create`,
    HRMS_PAY_REGISTER_UPDATE: `${API_URL}/hrms/pay_register_update`,
    HRMS_PAY_REGISTER_SALARY: `${API_URL}/hrms/pay_register_salary`,
    HRMS_PAY_REGISTER_PROCESS: `${API_URL}/hrms/pay_register_process`,

    // Designation Master endpoints
    DESIGNATION_TABLE: `${API_URL}/hrmsMasters/get_designation_table`,
    DESIGNATION_BY_ID: `${API_URL}/hrmsMasters/get_designation_by_id`,
    DESIGNATION_CREATE_SETUP: `${API_URL}/hrmsMasters/designation_create_setup`,
    DESIGNATION_CREATE: `${API_URL}/hrmsMasters/designation_create`,
    DESIGNATION_EDIT: `${API_URL}/hrmsMasters/designation_edit`,

    // Worker Category Master endpoints
    CATEGORY_TABLE: `${API_URL}/hrmsMasters/get_category_table`,
    CATEGORY_BY_ID: `${API_URL}/hrmsMasters/get_category_by_id`,
    CATEGORY_CREATE_SETUP: `${API_URL}/hrmsMasters/category_create_setup`,
    CATEGORY_CREATE: `${API_URL}/hrmsMasters/category_create`,
    CATEGORY_EDIT: `${API_URL}/hrmsMasters/category_edit`,

    // Contractor Master endpoints
    CONTRACTOR_TABLE: `${API_URL}/contractorMaster/get_contractor_table`,
    CONTRACTOR_BY_ID: `${API_URL}/contractorMaster/get_contractor_by_id`,
    CONTRACTOR_CREATE_SETUP: `${API_URL}/contractorMaster/contractor_create_setup`,
    CONTRACTOR_CREATE: `${API_URL}/contractorMaster/contractor_create`,
    CONTRACTOR_EDIT: `${API_URL}/contractorMaster/contractor_edit`,

    // Bank Details Master endpoints
    BANK_DETAILS_TABLE: `${API_URL}/bankDetailsMaster/get_bank_details_table`,
    BANK_DETAILS_BY_ID: `${API_URL}/bankDetailsMaster/get_bank_detail_by_id`,
    BANK_DETAILS_CREATE_SETUP: `${API_URL}/bankDetailsMaster/bank_details_create_setup`,
    BANK_DETAILS_CREATE: `${API_URL}/bankDetailsMaster/bank_details_create`,
    BANK_DETAILS_EDIT: `${API_URL}/bankDetailsMaster/bank_details_edit`,

    // Customer Master endpoints (tbl_customer_mst)
    CUSTOMER_TABLE: `${API_URL}/customerMaster/get_customer_table`,
    CUSTOMER_BY_ID: `${API_URL}/customerMaster/get_customer_by_id`,
    CUSTOMER_CREATE: `${API_URL}/customerMaster/customer_create`,
    CUSTOMER_EDIT: `${API_URL}/customerMaster/customer_edit`,

    // =============================================
    // Accounting Module endpoints
    // =============================================

    // Setup & Masters
    ACC_ACTIVATE_COMPANY: `${API_URL}/accounting/activate_company`,
    ACC_LEDGER_GROUPS: `${API_URL}/accounting/ledger_groups`,
    ACC_LEDGER_GROUP_CREATE: `${API_URL}/accounting/ledger_groups`,
    ACC_LEDGERS: `${API_URL}/accounting/ledgers`,
    ACC_LEDGER_CREATE: `${API_URL}/accounting/ledgers`,
    ACC_LEDGER_EDIT: `${API_URL}/accounting/ledgers`,
    ACC_PARTIES_DROPDOWN: `${API_URL}/accounting/parties_dropdown`,
    ACC_VOUCHER_TYPES: `${API_URL}/accounting/voucher_types`,
    ACC_FINANCIAL_YEARS: `${API_URL}/accounting/financial_years`,
    ACC_FINANCIAL_YEAR_CREATE: `${API_URL}/accounting/financial_years`,
    ACC_ACCOUNT_DETERMINATIONS: `${API_URL}/accounting/account_determinations`,
    ACC_ACCOUNT_DETERMINATIONS_UPDATE: `${API_URL}/accounting/account_determinations`,

    // Voucher Operations
    ACC_VOUCHERS: `${API_URL}/accounting/vouchers`,
    ACC_VOUCHER_CREATE: `${API_URL}/accounting/vouchers`,
    ACC_VOUCHER_DETAIL: `${API_URL}/accounting/vouchers`,
    ACC_VOUCHER_OPEN: `${API_URL}/accounting/vouchers`,
    ACC_VOUCHER_CANCEL: `${API_URL}/accounting/vouchers`,
    ACC_VOUCHER_SEND_APPROVAL: `${API_URL}/accounting/vouchers`,
    ACC_VOUCHER_APPROVE: `${API_URL}/accounting/vouchers`,
    ACC_VOUCHER_REJECT: `${API_URL}/accounting/vouchers`,
    ACC_VOUCHER_REOPEN: `${API_URL}/accounting/vouchers`,
    ACC_VOUCHER_REVERSE: `${API_URL}/accounting/vouchers`,
    ACC_VOUCHER_SETTLE_BILLS: `${API_URL}/accounting/vouchers`,

    // Reports
    ACC_REPORT_TRIAL_BALANCE: `${API_URL}/accounting/reports/trial_balance`,
    ACC_REPORT_PROFIT_LOSS: `${API_URL}/accounting/reports/profit_loss`,
    ACC_REPORT_BALANCE_SHEET: `${API_URL}/accounting/reports/balance_sheet`,
    ACC_REPORT_LEDGER: `${API_URL}/accounting/reports/ledger_report`,
    ACC_REPORT_DAY_BOOK: `${API_URL}/accounting/reports/day_book`,
    ACC_REPORT_CASH_BOOK: `${API_URL}/accounting/reports/cash_book`,
    ACC_REPORT_PARTY_OUTSTANDING: `${API_URL}/accounting/reports/party_outstanding`,
    ACC_REPORT_AGEING: `${API_URL}/accounting/reports/ageing_analysis`,
    ACC_REPORT_GST_SUMMARY: `${API_URL}/accounting/reports/gst_summary`,

    // Opening Balance
    ACC_OPENING_BILLS_IMPORT: `${API_URL}/accounting/opening_bills/import`,

    // Shift Master endpoints
    SHIFT_TABLE: `${API_URL}/masters/get_shift_table`,
    SHIFT_BY_ID: `${API_URL}/masters/get_shift_by_id`,
    SHIFT_CREATE_SETUP: `${API_URL}/masters/shift_create_setup`,
    SHIFT_CREATE: `${API_URL}/masters/shift_create`,
    SHIFT_EDIT: `${API_URL}/masters/shift_edit`,

    // Spell Master endpoints
    SPELL_TABLE: `${API_URL}/masters/get_spell_table`,
    SPELL_BY_ID: `${API_URL}/masters/get_spell_by_id`,
    SPELL_CREATE_SETUP: `${API_URL}/masters/spell_create_setup`,
    SPELL_CREATE: `${API_URL}/masters/spell_create`,
    SPELL_EDIT: `${API_URL}/masters/spell_edit`,

    // Machine Type Master endpoints
    MACHINE_TYPE_TABLE: `${API_URL}/machineTypeMaster/get_machine_type_table`,
    MACHINE_TYPE_BY_ID: `${API_URL}/machineTypeMaster/get_machine_type_by_id`,
    MACHINE_TYPE_CREATE: `${API_URL}/machineTypeMaster/machine_type_create`,
    MACHINE_TYPE_EDIT: `${API_URL}/machineTypeMaster/machine_type_edit`,
    MACHINE_TYPE_DELETE: `${API_URL}/machineTypeMaster/machine_type_delete`,

    // HRMS Leave Type Master endpoints
    LEAVE_TYPE_TABLE: `${API_URL}/hrmsMasters/get_leave_type_table`,
    LEAVE_TYPE_BY_ID: `${API_URL}/hrmsMasters/get_leave_type_by_id`,
    LEAVE_TYPE_CREATE: `${API_URL}/hrmsMasters/leave_type_create`,
    LEAVE_TYPE_EDIT: `${API_URL}/hrmsMasters/leave_type_edit`,

    // HRMS Employee Rate Entry endpoints
    EMP_RATE_EMPLOYEE_LOOKUP: `${API_URL}/hrmsMasters/emp_rate_employee_lookup`,
    EMP_RATE_LIST: `${API_URL}/hrmsMasters/emp_rate_list`,
    EMP_RATE_BY_ID: `${API_URL}/hrmsMasters/emp_rate_by_id`,
    EMP_RATE_CREATE: `${API_URL}/hrmsMasters/emp_rate_create`,
    EMP_RATE_UPDATE: `${API_URL}/hrmsMasters/emp_rate_update`,
    EMP_RATE_EXCEL_VALIDATE: `${API_URL}/hrmsMasters/emp_rate_excel_validate`,
    EMP_RATE_EXCEL_COMMIT: `${API_URL}/hrmsMasters/emp_rate_excel_commit`,
    EMP_RATE_EXCEL_UPLOAD: `${API_URL}/hrmsMasters/emp_rate_excel_upload`,

    // HRMS Designation Norms Set endpoints
    DESIG_NORMS_SETUP: `${API_URL}/hrmsMasters/desig_norms_setup`,
    DESIG_NORMS_TABLE: `${API_URL}/hrmsMasters/get_desig_norms_table`,
    DESIG_NORMS_BY_ID: `${API_URL}/hrmsMasters/get_desig_norms_by_id`,
    DESIG_NORMS_CREATE: `${API_URL}/hrmsMasters/desig_norms_create`,
    DESIG_NORMS_EDIT: `${API_URL}/hrmsMasters/desig_norms_edit`,
    DESIG_NORMS_DELETE: `${API_URL}/hrmsMasters/desig_norms_delete`,

    // HRMS Daily Machine Entry endpoints
    DAILY_MACHINE_TABLE: `${API_URL}/hrmsMasters/get_daily_machine_table`,
    DAILY_MACHINE_BY_ID: `${API_URL}/hrmsMasters/get_daily_machine_by_id`,
    DAILY_MACHINE_LOOKUP_MC: `${API_URL}/hrmsMasters/daily_machine_lookup_mc`,
    DAILY_MACHINE_CREATE: `${API_URL}/hrmsMasters/daily_machine_create`,
    DAILY_MACHINE_EDIT: `${API_URL}/hrmsMasters/daily_machine_edit`,
    DAILY_MACHINE_FINAL_PROCESS: `${API_URL}/hrmsMasters/daily_machine_final_process`,

    // HRMS Daily Man-Machine summary/details endpoints
    MAN_MACHINE_LIST: `${API_URL}/hrmsMasters/man_machine_list`,
    MAN_MACHINE_FINAL_PROCESS: `${API_URL}/hrmsMasters/man_machine_final_process`,

    // HRMS Man-Machine Master (mc_occu_link_mst) endpoints
    MAN_MACHINE_MST_SETUP: `${API_URL}/hrmsMasters/man_machine_mst_setup`,
    MAN_MACHINE_MST_TABLE: `${API_URL}/hrmsMasters/get_man_machine_mst_table`,
    MAN_MACHINE_MST_BY_ID: `${API_URL}/hrmsMasters/get_man_machine_mst_by_id`,
    MAN_MACHINE_MST_CREATE: `${API_URL}/hrmsMasters/man_machine_mst_create`,
    MAN_MACHINE_MST_EDIT: `${API_URL}/hrmsMasters/man_machine_mst_edit`,
    MAN_MACHINE_MST_DELETE: `${API_URL}/hrmsMasters/man_machine_mst_delete`,

    // HRMS Bio Attendance Updation endpoints
    BIO_ATT_LIST: `${API_URL}/hrmsMasters/bio_att_list`,
    DAILY_ATT_LIST: `${API_URL}/hrmsMasters/daily_att_list`,
    BIO_ATT_UPLOAD: `${API_URL}/hrmsMasters/bio_att_upload`,
    BIO_ATT_CLEAR: `${API_URL}/hrmsMasters/bio_att_clear`,
    BIO_ATT_PROCESS: `${API_URL}/hrmsMasters/bio_att_process`,
    BIO_ATT_FINAL_PROCESS: `${API_URL}/hrmsMasters/bio_att_final_process`,
    BIO_ATT_TEMP_COUNT: `${API_URL}/hrmsMasters/bio_att_temp_count`,
    BIO_ATT_MAX_LOG_ID: `${API_URL}/hrmsMasters/bio_att_max_log_id`,
    BIO_ATT_ETRACK: `${API_URL}/hrmsMasters/bio_att_etrack`,
    BIO_ATT_ETRACK_PROCESS: `${API_URL}/hrmsMasters/bio_att_etrack_process`,
    BIO_ATT_ETRACK_PROCESS_D: `${API_URL}/hrmsMasters/bio_att_etrack_process_d`,
    BIO_ATT_BPROCESS: `${API_URL}/hrmsMasters/bio_att_bprocess`,
    BIO_ATT_B_ATTEN: `${API_URL}/hrmsMasters/bio_att_b_atten`,
    BIO_ATT_WAGES_REGISTER: `${API_URL}/hrmsMasters/wages_register`,
    BIO_ATT_EXCEL_STATUS: (jobId: string) =>
        `${API_URL}/hrmsMasters/bio_att_excel_status/${encodeURIComponent(jobId)}`,

    // HRMS Reports
    EMP_ATTENDANCE_REPORT_SETUP: `${API_URL}/hrmsReports/emp_attendance_setup`,
    EMP_ATTENDANCE_REPORT: `${API_URL}/hrmsReports/emp_attendance_report`,
    EMP_WAGES_REPORT_SETUP: `${API_URL}/hrmsReports/emp_wages_setup`,
    EMP_WAGES_REPORT: `${API_URL}/hrmsReports/emp_wages_report`,

    // Mis Entries - Yarn Purchase (tbl_yarn_transaction) endpoints
    YARN_PURCHASE_LIST: `${API_URL}/misEntries/yarn_purchase_list`,
    YARN_PURCHASE_BY_ID: `${API_URL}/misEntries/yarn_purchase_by_id`,
    YARN_PURCHASE_SETUP: `${API_URL}/misEntries/yarn_purchase_setup`,
    YARN_PURCHASE_CREATE: `${API_URL}/misEntries/yarn_purchase_create`,
    YARN_PURCHASE_UPDATE: `${API_URL}/misEntries/yarn_purchase_update`,

    // Mis Entries - Electricity / DG (tbl_other_entries) endpoints
    ELECTRICITY_DG_LIST: `${API_URL}/misEntries/electricity_dg_list`,
    ELECTRICITY_DG_BY_ID: `${API_URL}/misEntries/electricity_dg_by_id`,
    ELECTRICITY_DG_SETUP: `${API_URL}/misEntries/electricity_dg_setup`,
    ELECTRICITY_DG_CREATE: `${API_URL}/misEntries/electricity_dg_create`,
    ELECTRICITY_DG_UPDATE: `${API_URL}/misEntries/electricity_dg_update`,

    // MIS Reports - 8-period MIS report
    MIS_REPORT: `${API_URL}/misReports/mis_report`,
    MIS_REPORT_EXCEL: `${API_URL}/misReports/mis_report_excel`,
    MIS_REPORT_PDF: `${API_URL}/misReports/mis_report_pdf`,
};

export { apiRoutes, apiRoutesconsole, apiRoutesPortalMasters };

// NEXT_PUBLIC_API_BASE_URL=/api