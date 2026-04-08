import { registerModule } from '../registry.js';
import { caLienLaw } from './ca-lien-law.js';
import { caPrevailingWage } from './ca-prevailing-wage.js';
import { caTitle24 } from './ca-title24.js';
import { caCalosha } from './ca-calosha.js';
import { caInsuranceLaw } from './ca-insurance-law.js';
import { caPublicWorksPayment } from './ca-public-works-payment.js';
import { caDisputeResolution } from './ca-dispute-resolution.js';
import { caLiquidatedDamages } from './ca-liquidated-damages.js';

registerModule(caLienLaw);
registerModule(caPrevailingWage);
registerModule(caTitle24);
registerModule(caCalosha);
registerModule(caInsuranceLaw);
registerModule(caPublicWorksPayment);
registerModule(caDisputeResolution);
registerModule(caLiquidatedDamages);
