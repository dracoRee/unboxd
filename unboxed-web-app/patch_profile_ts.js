const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'unboxed-web-app/src/app/pages/profile/profile.component.ts');
let content = fs.readFileSync(filePath, 'utf8');

if (!content.includes('VouchService')) {
  content = content.replace(
    "import { SupabaseService } from '../../services/supabase.service';",
    "import { SupabaseService } from '../../services/supabase.service';\nimport { VouchService } from '../../services/vouch.service';"
  );
}

content = content.replace(
  "private supabaseService: SupabaseService\n  ) {}",
  "private supabaseService: SupabaseService,\n    private vouchService: VouchService\n  ) {}"
);

const toggleVouchMethod = `
  toggleUserVouch() {
    const currentUser = this.authService.backendUser();
    if (!currentUser || !this.profile || this.isOwnProfile) return;

    this.profile.hasVouched = !this.profile.hasVouched;
    this.profile.vouchCount = (this.profile.vouchCount || 0) + (this.profile.hasVou    this.profile.vouchCount = (thivice.toggleVouch('USER', this.profile.id, this.profile.hasVouched).subscribe({
      next: (res) => {
        if (this.profile) this.profile.vouchCount = res.vo        if (this.profile) this.profile.vouchCou           if (this.profile) this.profile., err);
        // revert
                                                                             .hasVouched;
          this.profile.vouchCount = (this.profile.vouchCount || 0) + (this.profile.hasVouched ? 1 : -1);
        }
      }
    });
  }
`;

if (!content.includes('toggleUserVouch()')) {
  content = content.replace(  content = content.replace(  content = content.replace(  content = content.replace(  conten(f lePath, content);
