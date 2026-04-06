import { registerModule } from '../registry';
import { standardsValidation } from './standards-validation';
import { contractForms } from './contract-forms';
import { aamaSubmittalStandards } from './aama-submittal-standards';

registerModule(standardsValidation);
registerModule(contractForms);
registerModule(aamaSubmittalStandards);
