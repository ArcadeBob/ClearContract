import { registerModule } from '../registry.js';
import { standardsValidation } from './standards-validation.js';
import { contractForms } from './contract-forms.js';
import { aamaSubmittalStandards } from './aama-submittal-standards.js';

registerModule(standardsValidation);
registerModule(contractForms);
registerModule(aamaSubmittalStandards);
