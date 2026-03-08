export interface KnowledgeModule {
  id: string;
  domain: 'regulatory' | 'trade' | 'standards';
  title: string;
  effectiveDate: string;
  reviewByDate: string;
  content: string;
  tokenEstimate: number;
}

export interface CompanyProfile {
  // Insurance
  glPerOccurrence: string;
  glAggregate: string;
  umbrellaLimit: string;
  autoLimit: string;
  wcStatutoryState: string;
  wcEmployerLiability: string;

  // Bonding
  bondingSingleProject: string;
  bondingAggregate: string;

  // Licenses
  contractorLicenseType: string;
  contractorLicenseNumber: string;
  contractorLicenseExpiry: string;
  dirRegistration: string;
  dirExpiry: string;
  sbeCertId: string;
  sbeCertIssuer: string;
  lausdVendorNumber: string;

  // Capabilities
  employeeCount: string;
  serviceArea: string;
  typicalProjectSizeMin: string;
  typicalProjectSizeMax: string;
}

export const DEFAULT_COMPANY_PROFILE: CompanyProfile = {
  glPerOccurrence: '$1,000,000',
  glAggregate: '$2,000,000',
  umbrellaLimit: '$1,000,000',
  autoLimit: '$1,000,000',
  wcStatutoryState: 'CA',
  wcEmployerLiability: '$1,000,000',
  bondingSingleProject: '$500,000',
  bondingAggregate: '$1,000,000',
  contractorLicenseType: 'C-17',
  contractorLicenseNumber: '965590',
  contractorLicenseExpiry: '2026-09-30',
  dirRegistration: 'PW-LR-1001072989',
  dirExpiry: '2026-06-30',
  sbeCertId: '2034373',
  sbeCertIssuer: 'DGS',
  lausdVendorNumber: '1000012976',
  employeeCount: '15-25',
  serviceArea: 'Southern California',
  typicalProjectSizeMin: '$50,000',
  typicalProjectSizeMax: '$2,000,000',
};
