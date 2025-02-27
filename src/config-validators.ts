import { HomeAssistant } from "custom-card-helpers";

import {
    CalibrationPoint,
    CalibrationSourceConfig,
    CardPresetConfig,
    IconActionConfig,
    IconConfig,
    LabelConfig,
    MapModeConfig,
    MapSourceConfig,
    PredefinedPointConfig,
    PredefinedSelectionConfig,
    PredefinedZoneConfig,
    RoomConfig,
    ServiceCallSchemaConfig,
    TileConfig,
    TranslatableString,
    XiaomiVacuumMapCardConfig,
} from "./types/types";
import { localizeTranslatable } from "./localize/localize";
import { MapMode } from "./model/map_mode/map-mode";
import { SelectionType } from "./model/map_mode/selection-type";
import { PlatformGenerator } from "./model/generators/platform-generator";

function validateMapSource(mapSource: MapSourceConfig): TranslatableString[] {
    if (!mapSource.camera && !mapSource.image) {
        return ["validation.preset.map_source.none_provided"];
    }
    if (mapSource.camera && mapSource.image) {
        return ["validation.preset.map_source.ambiguous"];
    }
    return [];
}

function validateCalibrationPoint(calibrationPoint: CalibrationPoint): TranslatableString[] {
    const errors: TranslatableString[] = [];
    if (!calibrationPoint?.map) {
        errors.push("validation.preset.calibration_source.calibration_points.missing_map");
    }
    if (!calibrationPoint?.vacuum) {
        errors.push("validation.preset.calibration_source.calibration_points.missing_vacuum");
    }
    if ([calibrationPoint?.map, calibrationPoint?.vacuum].filter(p => !p.x || !p.y).length > 0) {
        errors.push("validation.preset.calibration_source.calibration_points.missing_coordinate");
    }
    return errors;
}

function validateCalibrationSource(calibrationSource: CalibrationSourceConfig): TranslatableString[] {
    if (Object.keys(calibrationSource).filter(k => k != "attribute").length > 1) {
        return ["validation.preset.calibration_source.ambiguous"];
    }
    if (calibrationSource.calibration_points) {
        if (![3, 4].includes(calibrationSource.calibration_points.length)) {
            return ["validation.preset.calibration_source.calibration_points.invalid_number"];
        }
        return calibrationSource.calibration_points.flatMap(cp => validateCalibrationPoint(cp));
    }
    return [];
}

function validateIconConfig(config: IconActionConfig): TranslatableString[] {
    if (!config) {
        return ["validation.preset.icons.invalid"];
    }
    const errors: TranslatableString[] = [];
    if (!config.icon) {
        errors.push("validation.preset.icons.icon.missing");
    }
    return errors;
}

function validateSensorConfig(config: TileConfig): TranslatableString[] {
    if (!config) {
        return ["validation.preset.tiles.invalid"];
    }
    const errors: TranslatableString[] = [];
    if (!config.entity) {
        errors.push("validation.preset.tiles.entity.missing");
    }
    if (!config.label) {
        errors.push("validation.preset.tiles.label.missing");
    }
    return errors;
}

function validateIcon(config: IconConfig): TranslatableString[] {
    if (!config.x) {
        return ["validation.preset.map_modes.predefined_selections.icon.x.missing"];
    }
    if (!config.y) {
        return ["validation.preset.map_modes.predefined_selections.icon.y.missing"];
    }
    if (!config.name) {
        return ["validation.preset.map_modes.predefined_selections.icon.name.missing"];
    }
    return [];
}

function validateLabel(config: LabelConfig): TranslatableString[] {
    if (!config.x) {
        return ["validation.preset.map_modes.predefined_selections.label.x.missing"];
    }
    if (!config.y) {
        return ["validation.preset.map_modes.predefined_selections.label.y.missing"];
    }
    if (!config.text) {
        return ["validation.preset.map_modes.predefined_selections.label.text.missing"];
    }
    return [];
}

function validatePredefinedRectangleConfig(ps: PredefinedSelectionConfig): TranslatableString[] {
    const config = ps as PredefinedZoneConfig;
    const errors: TranslatableString[] = [];
    if (!config.zones) {
        errors.push("validation.preset.map_modes.predefined_selections.zones.missing");
    }
    if (typeof config.zones !== "string" && config.zones.filter(z => z.length != 4).length > 0) {
        errors.push("validation.preset.map_modes.predefined_selections.zones.invalid_parameters_number");
    }
    if (config.icon) {
        validateIcon(config.icon).forEach(e => errors.push(e));
    }
    if (config.label) {
        validateLabel(config.label).forEach(e => errors.push(e));
    }
    return errors;
}

function validatePredefinedPointConfig(ps: PredefinedSelectionConfig): TranslatableString[] {
    const config = ps as PredefinedPointConfig;
    const errors: TranslatableString[] = [];
    if (!config.position) {
        errors.push("validation.preset.map_modes.predefined_selections.points.position.missing");
    }
    if (typeof config.position !== "string" && config.position?.length != 2) {
        errors.push("validation.preset.map_modes.predefined_selections.points.position.invalid_parameters_number");
    }
    if (config.icon) {
        validateIcon(config.icon).forEach(e => errors.push(e));
    }
    if (config.label) {
        validateLabel(config.label).forEach(e => errors.push(e));
    }
    return errors;
}

function validateRoomConfig(ps: PredefinedSelectionConfig): TranslatableString[] {
    const config = ps as RoomConfig;
    const errors: TranslatableString[] = [];
    if (!config.id) {
        errors.push("validation.preset.map_modes.predefined_selections.rooms.id.missing");
    }
    if (!config.id.toString().match(/^[a-z0-9]+$/i)) {
        errors.push([
            "validation.preset.map_modes.predefined_selections.rooms.id.invalid_format",
            "{0}",
            config.id.toString(),
        ]);
    }
    if ((config.outline ?? []).filter(o => o.length != 2).length > 0) {
        errors.push("validation.preset.map_modes.predefined_selections.rooms.outline.invalid_parameters_number");
    }
    if (config.icon) {
        validateIcon(config.icon).forEach(e => errors.push(e));
    }
    if (config.label) {
        validateLabel(config.label).forEach(e => errors.push(e));
    }
    return errors;
}

function validateServiceCallSchemaConfig(config: ServiceCallSchemaConfig): TranslatableString[] {
    if (!config.service) {
        return ["validation.preset.map_modes.service_call_schema.service.missing"];
    }
    if (!config.service.includes(".")) {
        return [["validation.preset.map_modes.service_call_schema.service.invalid", "{0}", config.service]];
    }
    return [];
}

function validateMapModeConfig(vacuumPlatform: string, config: MapModeConfig): TranslatableString[] {
    if (!config) {
        return ["validation.preset.map_modes.invalid"];
    }
    if (config.template && !PlatformGenerator.isValidModeTemplate(vacuumPlatform, config.template)) {
        return [["validation.preset.map_modes.template.invalid", "{0}", config.template]];
    }
    const errors: TranslatableString[] = [];
    if (!config.template && !config.icon) {
        errors.push("validation.preset.map_modes.icon.missing");
    }
    if (!config.template && !config.name) {
        errors.push("validation.preset.map_modes.name.missing");
    }
    if (!config.template && !config.service_call_schema) {
        errors.push("validation.preset.map_modes.service_call_schema.missing");
    }
    const parsed = new MapMode(vacuumPlatform, config);
    switch (parsed.selectionType) {
        case SelectionType.PREDEFINED_RECTANGLE:
            parsed.predefinedSelections
                .flatMap(ps => validatePredefinedRectangleConfig(ps))
                .forEach(e => errors.push(e));
            break;
        case SelectionType.ROOM:
            parsed.predefinedSelections.flatMap(ps => validateRoomConfig(ps)).forEach(e => errors.push(e));
            break;
        case SelectionType.PREDEFINED_POINT:
            parsed.predefinedSelections.flatMap(ps => validatePredefinedPointConfig(ps)).forEach(e => errors.push(e));
            break;
        case SelectionType.MANUAL_RECTANGLE:
        case SelectionType.MANUAL_PATH:
        case SelectionType.MANUAL_POINT:
            if (parsed.predefinedSelections?.length ?? 0 > 0) {
                errors.push([
                    "validation.preset.map_modes.predefined_selections.not_applicable",
                    "{0}",
                    SelectionType[parsed.selectionType],
                ]);
            }
    }
    if (config.service_call_schema)
        validateServiceCallSchemaConfig(config.service_call_schema).forEach(e => errors.push(e));
    return errors;
}

function validatePreset(config: CardPresetConfig, nameRequired: boolean): TranslatableString[] {
    const errors: TranslatableString[] = [];
    const mandatoryFields = new Map<string, string>([
        ["entity", "validation.preset.entity.missing"],
        ["map_source", "validation.preset.map_source.missing"],
        ["calibration_source", "validation.preset.calibration_source.missing"],
    ]);
    const params = Object.keys(config);
    mandatoryFields.forEach((v: string, k: string) => {
        if (!params.includes(k)) {
            errors.push(v);
        }
    });
    if (config.map_source) validateMapSource(config.map_source).forEach(e => errors.push(e));
    if (config.calibration_source) validateCalibrationSource(config.calibration_source).forEach(e => errors.push(e));
    if (config.vacuum_platform && !PlatformGenerator.getPlatforms().includes(config.vacuum_platform))
        errors.push(["validation.preset.platform.invalid", "{0}", config.vacuum_platform]);
    const vacuumPlatform = config.vacuum_platform ?? "default";
    (config.icons ?? []).flatMap(i => validateIconConfig(i)).forEach(e => errors.push(e));
    (config.tiles ?? []).flatMap(i => validateSensorConfig(i)).forEach(e => errors.push(e));
    (config.map_modes ?? []).flatMap(i => validateMapModeConfig(vacuumPlatform, i)).forEach(e => errors.push(e));
    if (!config.preset_name && nameRequired) errors.push("validation.preset.preset_name.missing");
    return errors;
}

export function validateConfig(config: XiaomiVacuumMapCardConfig): string[] {
    const errors: TranslatableString[] = [];
    const multiplePresets = (config.additional_presets?.length ?? 0) > 0;
    validatePreset(config, multiplePresets).forEach(e => errors.push(e));
    config.additional_presets?.flatMap(preset => validatePreset(preset, multiplePresets)).forEach(e => errors.push(e));
    return errors.map(e => localizeTranslatable(e));
}

export function isOldConfig(config: XiaomiVacuumMapCardConfig): boolean {
    return config.map_image || config.map_camera;
}

export function areAllEntitiesDefined(usedEntities: string[], hass: HomeAssistant): string[] {
    const availableEntities = Object.keys(hass.states);
    return usedEntities.filter(e => !availableEntities.includes(e));
}
