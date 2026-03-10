import { registerModule } from '../registry';
import { standardsValidation } from './standards-validation';
import { contractForms } from './contract-forms';

registerModule(standardsValidation);
registerModule(contractForms);
