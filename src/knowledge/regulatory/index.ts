import { registerModule } from '../registry';
import { caLienLaw } from './ca-lien-law';
import { caPrevailingWage } from './ca-prevailing-wage';
import { caTitle24 } from './ca-title24';
import { caCalosha } from './ca-calosha';
import { caInsuranceLaw } from './ca-insurance-law';
import { caPublicWorksPayment } from './ca-public-works-payment';
import { caDisputeResolution } from './ca-dispute-resolution';
import { caLiquidatedDamages } from './ca-liquidated-damages';

registerModule(caLienLaw);
registerModule(caPrevailingWage);
registerModule(caTitle24);
registerModule(caCalosha);
registerModule(caInsuranceLaw);
registerModule(caPublicWorksPayment);
registerModule(caDisputeResolution);
registerModule(caLiquidatedDamages);
