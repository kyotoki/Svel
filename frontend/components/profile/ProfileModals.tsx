import { MapStyle } from "../../contexts/PreferencesContext";
import { Adventure } from "../../types/adventure";
import { Achievement } from "../../utils/achievements";
import { LocalProfileFields } from "../../utils/profileStorage";
import { UnitSystem } from "../../utils/units";
import AdventureDetailModal from "../map/AdventureDetailModal";
import AchievementDetailModal from "./AchievementDetailModal";
import CertificationsModal from "./CertificationsModal";
import EditProfileModal from "./EditProfileModal";
import GearManagerModal from "./GearManagerModal";
import MapStylePickerModal from "./MapStylePickerModal";
import PrivacyControlsModal from "./PrivacyControlsModal";
import SettingsMenuModal from "./SettingsMenuModal";
import SvelProModal from "./SvelProModal";

const MAP_STYLE_LABELS: Record<MapStyle, string> = {
  standard: "Standard",
  satellite: "Satellite",
  hybrid: "Hybrid",
};

interface ProfileModalsProps {
  selectedAdventure: Adventure | null;
  onCloseAdventure: () => void;
  onDeleteAdventure: (adventure: Adventure) => Promise<void>;

  isGearModalVisible: boolean;
  onCloseGearModal: () => void;
  gear: LocalProfileFields["gear"];
  adventures: Adventure[];
  onUpdateGear: (gear: LocalProfileFields["gear"]) => void;

  isEditProfileVisible: boolean;
  onCloseEditProfile: () => void;
  profile: LocalProfileFields;
  onUpdateProfile: (patch: Partial<LocalProfileFields>) => void;

  isPrivacyModalVisible: boolean;
  onClosePrivacyModal: () => void;

  isMapStylePickerVisible: boolean;
  onCloseMapStylePicker: () => void;
  mapStyle: MapStyle;
  onSelectMapStyle: (style: MapStyle) => void;

  isSettingsMenuVisible: boolean;
  onCloseSettingsMenu: () => void;
  onEditProfile: () => void;
  onManageGear: () => void;
  onOpenSvelPro: () => void;
  onPrivacyControls: () => void;
  onMapPreferences: () => void;
  unitSystem: UnitSystem;
  onUnitSystemChange: (unitSystem: UnitSystem) => void;
  onLogOut: () => void;
  appVersion: string;
  isPro: boolean;

  isSvelProModalVisible: boolean;
  onCloseSvelProModal: () => void;

  isCertificationsModalVisible: boolean;
  onCloseCertificationsModal: () => void;
  certifications: string[];
  onToggleCertification: (value: string) => void;

  selectedAchievement: Achievement | null;
  onCloseAchievement: () => void;
}

// Bundles every modal owned by the profile screen into one place - none of
// these carry their own significant layout logic (each is already its own
// component), so grouping the instantiation keeps the screen's main render
// focused on the page content instead of ~150 lines of modal wiring.
export default function ProfileModals({
  selectedAdventure,
  onCloseAdventure,
  onDeleteAdventure,
  isGearModalVisible,
  onCloseGearModal,
  gear,
  adventures,
  onUpdateGear,
  isEditProfileVisible,
  onCloseEditProfile,
  profile,
  onUpdateProfile,
  isPrivacyModalVisible,
  onClosePrivacyModal,
  isMapStylePickerVisible,
  onCloseMapStylePicker,
  mapStyle,
  onSelectMapStyle,
  isSettingsMenuVisible,
  onCloseSettingsMenu,
  onEditProfile,
  onManageGear,
  onOpenSvelPro,
  onPrivacyControls,
  onMapPreferences,
  unitSystem,
  onUnitSystemChange,
  onLogOut,
  appVersion,
  isPro,
  isSvelProModalVisible,
  onCloseSvelProModal,
  isCertificationsModalVisible,
  onCloseCertificationsModal,
  certifications,
  onToggleCertification,
  selectedAchievement,
  onCloseAchievement,
}: ProfileModalsProps) {
  return (
    <>
      <AdventureDetailModal
        key={selectedAdventure?.id ?? "none"}
        adventure={selectedAdventure}
        allAdventures={adventures}
        onClose={onCloseAdventure}
        onDelete={onDeleteAdventure}
      />

      <GearManagerModal
        visible={isGearModalVisible}
        onClose={onCloseGearModal}
        gear={gear}
        adventures={adventures}
        onUpdate={onUpdateGear}
      />

      <EditProfileModal
        visible={isEditProfileVisible}
        onClose={onCloseEditProfile}
        profile={profile}
        onUpdateProfile={onUpdateProfile}
        gearSubtext={
          gear.length > 0 ? `${gear.length} item${gear.length === 1 ? "" : "s"} tracked` : "Add your wetsuit, fins, computer & more"
        }
        onManageGear={onManageGear}
        unitSystem={unitSystem}
        onUnitSystemChange={onUnitSystemChange}
        mapStyleLabel={MAP_STYLE_LABELS[mapStyle]}
        onMapPreferences={onMapPreferences}
        onPrivacyControls={onPrivacyControls}
      />

      <PrivacyControlsModal visible={isPrivacyModalVisible} onClose={onClosePrivacyModal} />

      <MapStylePickerModal
        visible={isMapStylePickerVisible}
        onClose={onCloseMapStylePicker}
        value={mapStyle}
        onSelect={onSelectMapStyle}
        isPro={isPro}
        onRequirePro={onOpenSvelPro}
      />

      <SettingsMenuModal
        visible={isSettingsMenuVisible}
        onClose={onCloseSettingsMenu}
        onEditProfile={onEditProfile}
        onOpenSvelPro={onOpenSvelPro}
        onLogOut={onLogOut}
        appVersion={appVersion}
      />

      <SvelProModal visible={isSvelProModalVisible} onClose={onCloseSvelProModal} />

      <CertificationsModal
        visible={isCertificationsModalVisible}
        onClose={onCloseCertificationsModal}
        certifications={certifications}
        onToggle={onToggleCertification}
      />

      <AchievementDetailModal achievement={selectedAchievement} onClose={onCloseAchievement} />
    </>
  );
}
