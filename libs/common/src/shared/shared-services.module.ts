import { Module } from '@nestjs/common';
import { CacheModule } from '@app/core/nest/cache/cache.module';

import { ScheduleModule } from '@nestjs/schedule';
import { EntityFeatureModule } from './EntityFeature.module';
import { SharedService } from './shared.service';
import { HospitalDeptSharedService } from './hospital-dept-shared.service';
import { HospitalUserSharedService } from './hospital-user-shared.service';
import { HospitalRoleSharedService } from './hospital-role-shared.service';
import { HospitalDictSharedService } from './hospital-dict-shared.service';
import { HospitalDictSelectService } from './hospital-dict-select.service';
import { OpUserSharedService } from './op-user-shared.service';
import { IdentityActiveService } from './identity-active.service';
import { HospitalStudentGroupSharedService } from './hospital-student-group-shared.service';

import { PasswordUtil } from '../utils/password';
import { DataScopeEngine } from '../utils/dataScopeEngine';

@Module({
  imports: [EntityFeatureModule, CacheModule, ScheduleModule.forRoot()],
  providers: [
    SharedService,
    HospitalDeptSharedService,
    HospitalUserSharedService,
    HospitalRoleSharedService,
    HospitalDictSharedService,
    HospitalDictSelectService,
    OpUserSharedService,
    IdentityActiveService,
    HospitalStudentGroupSharedService,
    PasswordUtil,
    DataScopeEngine,
  ],
  exports: [
    SharedService,
    HospitalDeptSharedService,
    HospitalUserSharedService,
    HospitalRoleSharedService,
    HospitalDictSharedService,
    HospitalDictSelectService,
    OpUserSharedService,
    IdentityActiveService,
    HospitalStudentGroupSharedService,
    PasswordUtil,
    DataScopeEngine,
  ],
})
export class SharedServicesModule {}
