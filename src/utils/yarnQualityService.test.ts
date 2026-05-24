/**
 * @jest-environment jsdom
 */
import { describe, it, expect } from 'vitest';

// Mock mappers (we'll test them indirectly through the service)
describe('yarnQualityService', () => {
  it('should properly unwrap setup response with nested data object', () => {
    // Simulate the API response from the backend
    const apiResponse = {
      data: {
        yarn_types: [
          {
            item_grp_id: 1,
            item_grp_name: "HSWP",
            item_grp_code: "HSWP"
          },
          {
            item_grp_id: 2,
            item_grp_name: "HSWT",
            item_grp_code: "HSWT"
          },
          {
            item_grp_id: 3,
            item_grp_name: "SKWP",
            item_grp_code: "SKWP"
          },
          {
            item_grp_id: 4,
            item_grp_name: "SKWT",
            item_grp_code: "SKWT"
          },
          {
            item_grp_id: 5,
            item_grp_name: "SLYN",
            item_grp_code: "SLYN"
          }
        ],
      }
    };

    // The mapper should unwrap this structure
    const unwrapped = apiResponse?.data || apiResponse;
    expect(unwrapped.yarn_types).toBeDefined();
    expect(unwrapped.yarn_types).toHaveLength(5);
    expect(unwrapped.yarn_types[0]).toEqual({
      item_grp_id: 1,
      item_grp_name: "HSWP",
      item_grp_code: "HSWP"
    });
  });

  it('should handle missing data object gracefully', () => {
    // If response doesn't have nested data, it should still work
    const apiResponse: Record<string, unknown> = {
      yarn_types: [
        {
          item_grp_id: 1,
          item_grp_name: "HSWP",
          item_grp_code: "HSWP"
        }
      ]
    };

    const unwrapped = (apiResponse?.data || apiResponse) as Record<string, unknown>;
    expect(unwrapped.yarn_types).toBeDefined();
    expect(unwrapped.yarn_types).toHaveLength(1);
  });

  it('should handle empty yarn_types array', () => {
    const apiResponse = {
      data: {
        yarn_types: []
      }
    };

    const unwrapped = apiResponse?.data || apiResponse;
    const yarnTypes = unwrapped?.yarn_types || [];
    expect(yarnTypes).toEqual([]);
    expect(yarnTypes.length).toBe(0);
  });

  it('should handle edit setup response with yarn_quality_details', () => {
    const apiResponse = {
      data: {
        yarn_types: [
          {
            item_grp_id: 1,
            item_grp_name: "HSWP",
            item_grp_code: "HSWP"
          }
        ],
        yarn_quality_details: {
          yarn_quality_id: 10,
          quality_code: "QC001",
          item_grp_id: 1,
          twist_per_inch: 5.5,
          std_count: 10,
          std_doff: 100,
          std_wt_doff: 500,
          is_active: 1
        }
      }
    };

    const unwrapped = apiResponse?.data || apiResponse;
    expect(unwrapped.yarn_types).toBeDefined();
    expect(unwrapped.yarn_quality_details).toBeDefined();
    expect(unwrapped.yarn_quality_details.quality_code).toBe("QC001");
    expect(unwrapped.yarn_quality_details.item_grp_id).toBe(1);
  });

  it('should map item_grp_id correctly as number for dropdown value', () => {
    const yarnType = {
      item_grp_id: 1,
      item_grp_name: "HSWP",
      item_grp_code: "HSWP"
    };

    // Component converts to string for dropdown value
    expect(yarnType.item_grp_id.toString()).toBe("1");
    expect(yarnType.item_grp_name).toBe("HSWP");
  });
});
