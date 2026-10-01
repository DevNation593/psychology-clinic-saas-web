/**
 * Subscription Feature Module
 * 
 * Central export point for all subscription-related components
 */

// Limit Modals
export { SeatLimitModal } from './seat-limit-modal';
export { PatientLimitModal } from './patient-limit-modal';
export { StorageLimitModal } from './storage-limit-modal';
export { FeatureLockedModal } from './feature-locked-modal';
export { FeatureLockedNotice, isFeatureLockedError } from './feature-locked-notice';

// Integration Examples (for reference)
export {
  InviteUserButton,
  CreatePatientButton,
  FileUploadButton,
  ClinicalNotesButton,
  PatientProfileActions,
} from './integration-examples';
