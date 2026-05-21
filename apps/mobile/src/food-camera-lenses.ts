import type { CameraType } from "expo-camera";

/**
 * Normalized lens record. expo-camera 55 returns localized name strings only;
 * PR #42916 will add deviceType — wire `fromLensInfo` when that ships.
 */
export type CameraLens = {
  /** Value for CameraView `selectedLens` (localizedName today, deviceType after PR #42916). */
  selectedValue: string;
  /** Apple AVCaptureDevice.DeviceType rawValue when available. */
  deviceType?: string;
  localizedName: string;
};

export type FoodCameraSelection = {
  facing: CameraType;
  lens?: string;
};

export type FoodCameraOption = FoodCameraSelection & {
  id: string;
  label: string;
};

/** Physical rear photo lenses — https://developer.apple.com/documentation/avfoundation/avcapturedevice/devicetype-swift.struct */
export const PHOTO_REAR_LENS_DEVICE_TYPES = new Set([
  "AVCaptureDeviceTypeBuiltInWideAngleCamera",
  "AVCaptureDeviceTypeBuiltInUltraWideCamera",
  "AVCaptureDeviceTypeBuiltInTelephotoCamera",
]);

const LENS_SORT_RANK_BY_DEVICE_TYPE: Record<string, number> = {
  AVCaptureDeviceTypeBuiltInWideAngleCamera: 0,
  AVCaptureDeviceTypeBuiltInUltraWideCamera: 1,
  AVCaptureDeviceTypeBuiltInTelephotoCamera: 2,
};

const LENS_LABEL_BY_DEVICE_TYPE: Record<string, string> = {
  AVCaptureDeviceTypeBuiltInWideAngleCamera: "Wide",
  AVCaptureDeviceTypeBuiltInUltraWideCamera: "Ultra Wide",
  AVCaptureDeviceTypeBuiltInTelephotoCamera: "Telephoto",
};

/** English localized names for standalone physical rear lenses (expo-camera 55 workaround). */
const PHYSICAL_REAR_LENS_LOCALIZED_PATTERN = /^(Back (Ultra Wide |Telephoto )?Camera)$/i;

export function toCameraLens(localizedName: string): CameraLens {
  return {
    selectedValue: localizedName,
    localizedName,
  };
}

/** Use when expo-camera exposes LensInfo from getAvailableLensesAsync / onAvailableLensesChanged. */
export function fromLensInfo(info: { deviceType: string; localizedName: string }): CameraLens {
  return {
    selectedValue: info.deviceType,
    deviceType: info.deviceType,
    localizedName: info.localizedName,
  };
}

function isPhotoRearLens(lens: CameraLens): boolean {
  if (lens.deviceType) {
    return PHOTO_REAR_LENS_DEVICE_TYPES.has(lens.deviceType);
  }

  if (lens.localizedName.length === 0) {
    return true;
  }

  return PHYSICAL_REAR_LENS_LOCALIZED_PATTERN.test(lens.localizedName.trim());
}

function filterSelectableRearCameraLensValues(lenses: readonly CameraLens[]): CameraLens[] {
  const named = lenses.filter((lens) => lens.localizedName.length > 0);
  const photoLenses = named.filter(isPhotoRearLens);

  if (photoLenses.length > 0) {
    return photoLenses;
  }

  // Non-English locales use different localized names — prefer showing lenses over none.
  if (named.length > 0) {
    return named;
  }

  return lenses.filter((lens) => lens.localizedName.length === 0);
}

/** Filter expo-camera 55 localized name strings to photo-capable rear lenses. */
export function filterSelectableRearCameraLenses(lenses: readonly string[]): string[] {
  const filtered = filterSelectableRearCameraLensValues(lenses.map(toCameraLens)).map(
    (lens) => lens.selectedValue,
  );

  if (filtered.length > 0) {
    return filtered;
  }

  return [""];
}

export function buildFoodCameraOptionId(facing: CameraType, lens?: string) {
  return lens ? `${facing}:${lens}` : facing;
}

export function isMainWideRearLens(lens?: string, deviceType?: string) {
  if (!lens || lens.length === 0) {
    return true;
  }

  if (deviceType === "AVCaptureDeviceTypeBuiltInWideAngleCamera") {
    return true;
  }

  return /^Back Camera$/i.test(lens.trim());
}

export function getRearLensSortRank(lens?: string, deviceType?: string) {
  if (deviceType && deviceType in LENS_SORT_RANK_BY_DEVICE_TYPE) {
    return LENS_SORT_RANK_BY_DEVICE_TYPE[deviceType] ?? 3;
  }

  if (isMainWideRearLens(lens, deviceType)) {
    return 0;
  }

  if (/\b(ultra\s*wide|ultrawide)\b/i.test(lens ?? "")) {
    return 1;
  }

  if (/\btelephoto\b/i.test(lens ?? "")) {
    return 2;
  }

  return 3;
}

export function getFoodCameraOptionLabel(lens?: string, deviceType?: string) {
  if (!lens && !deviceType) {
    return "Wide";
  }

  if (deviceType && deviceType in LENS_LABEL_BY_DEVICE_TYPE) {
    return LENS_LABEL_BY_DEVICE_TYPE[deviceType]!;
  }

  if (!lens) {
    return "Wide";
  }

  const label = lens
    .replace(/^Back\s+/i, "")
    .replace(/\s+Camera$/i, "")
    .replace(/^Camera$/i, "Main")
    .trim();

  return label || "Wide";
}

export function buildFoodCameraOptions(
  lensesByFacing: Partial<Record<CameraType, string[]>>,
  unavailableFacings: ReadonlySet<CameraType>,
  facingsToProbe: readonly CameraType[] = ["back"],
) {
  const options: FoodCameraOption[] = [];

  for (const facing of facingsToProbe) {
    if (unavailableFacings.has(facing)) {
      continue;
    }

    const lenses = lensesByFacing[facing];
    if (!lenses || lenses.length === 0) {
      continue;
    }

    const namedLenses = lenses.filter((lens) => lens.length > 0);
    if (namedLenses.length === 0) {
      options.push({
        id: facing,
        facing,
        label: getFoodCameraOptionLabel(),
      });
      continue;
    }

    for (const lens of namedLenses.sort(
      (left, right) => getRearLensSortRank(left) - getRearLensSortRank(right),
    )) {
      options.push({
        id: buildFoodCameraOptionId(facing, lens),
        facing,
        lens,
        label: getFoodCameraOptionLabel(lens),
      });
    }
  }

  return options;
}

export function nextFoodCameraOption(
  options: FoodCameraOption[],
  current: FoodCameraSelection,
): FoodCameraOption | undefined {
  if (options.length === 0) {
    return undefined;
  }

  const currentId = buildFoodCameraOptionId(current.facing, current.lens);
  const index = options.findIndex((option) => option.id === currentId);
  const nextIndex = index === -1 ? 0 : (index + 1) % options.length;
  return options[nextIndex];
}
