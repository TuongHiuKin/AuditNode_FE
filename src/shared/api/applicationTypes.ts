export const EMPTY_GUID = "00000000-0000-0000-0000-000000000000";

export interface ApplicationLabel {
  key: string;
  value: string;
}

export interface ApplicationDeployment {
  portMappingId: string;
  id: string;
  hostname: string;
  ipAddress: string;
  portNumber: number;
  protocol: string;
}

export interface ApplicationResponse {
  id: string;
  appCode: string;
  appName: string;
  ownerTeam: string;
  risk: string;
  icon: string;
  techStack: string;
  servers: ApplicationDeployment[];
  labels: ApplicationLabel[];
}

export interface CreateApplicationRequest {
  appCode: string;
  appName: string;
  ownerTeam: string;
  risk?: string;
  icon?: string;
  techStack?: string;
  labels: ApplicationLabel[];
  deployment?: {
    serverId: string;
    portNumber: number;
    protocol: string;
  };
}

export interface UpdateApplicationRequest {
  appName: string;
  ownerTeam: string;
  risk: string;
  icon: string;
  techStack: string;
  labels: ApplicationLabel[] | null;
  portMappingId?: string;
  serverId?: string;
  portNumber?: number;
}

export interface MigrateApplicationRequest {
  portMappingId: string;
  serverId: string;
  portNumber: number;
}

export interface ApplicationFilters {
  labelKey?: string;
  labelValue?: string;
}

export function isNonEmptyIdentifier(value: string | null | undefined): value is string {
  return !!value && value !== EMPTY_GUID;
}
