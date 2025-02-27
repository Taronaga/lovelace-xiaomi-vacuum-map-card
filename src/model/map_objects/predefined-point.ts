// noinspection CssUnresolvedCustomProperty
import { css, CSSResultGroup, svg, SVGTemplateResult } from "lit";
import { forwardHaptic, HomeAssistant } from "custom-card-helpers";

import { Context } from "./context";
import { IconConfig, PointType, PointWithRepeatsType, PredefinedPointConfig } from "../../types/types";
import { MapObject } from "./map-object";
import { deleteFromArray } from "../../utils";
import { MapMode } from "../map_mode/map-mode";

export class PredefinedPoint extends MapObject {
    private readonly _config: PredefinedPointConfig;
    private readonly _iconConfig: IconConfig;
    private _selected: boolean;

    constructor(config: PredefinedPointConfig, context: Context) {
        super(context);
        this._config = config;
        this._selected = false;
        this._iconConfig =
            this._config.icon ??
            ({
                x: this._config.position[0],
                y: this._config.position[1],
                name: "mdi:map-marker",
            } as IconConfig);
    }

    public render(): SVGTemplateResult {
        return svg`
            <g class="predefined-point-wrapper ${this._selected ? "selected" : ""}">
                ${this.renderIcon(this._iconConfig, () => this._click(), "predefined-point-icon-wrapper")}
                ${this.renderLabel(this._config.label, "predefined-point-label")}
            </g>
        `;
    }

    private _click(): void {
        this._selected = !this._selected;
        forwardHaptic("selection");
        if (this._selected) {
            const previous = this._context.selectedPredefinedPoint().pop();
            if (previous !== undefined) {
                previous._selected = false;
            }
            this._context.selectedPredefinedPoint().push(this);
        } else {
            deleteFromArray(this._context.selectedPredefinedPoint(), this);
        }
        if (this._context.runImmediately()) {
            this._selected = false;
            deleteFromArray(this._context.selectedPredefinedPoint(), this);
            return;
        }
        this.update();
    }

    public toVacuum(repeats: number | null = null): PointType | PointWithRepeatsType {
        if (typeof this._config.position === "string") {
            return [0, 0];
        }
        if (repeats === null) {
            return this._config.position;
        }
        return [...this._config.position, repeats];
    }

    static get styles(): CSSResultGroup {
        return css`
            .predefined-point-wrapper {
            }

            .predefined-point-icon-wrapper {
                x: var(--x-icon);
                y: var(--y-icon);
                height: var(--map-card-internal-predefined-point-icon-size);
                width: var(--map-card-internal-predefined-point-icon-size);
                border-radius: calc(var(--map-card-internal-predefined-point-icon-size) / 2);
                transform-box: fill-box;
                transform: scale(calc(1 / var(--map-scale)))
                    translate(
                        calc(var(--map-card-internal-predefined-point-icon-size) / -2),
                        calc(var(--map-card-internal-predefined-point-icon-size) / -2)
                    );
                background: var(--map-card-internal-predefined-point-icon-background-color);
                color: var(--map-card-internal-predefined-point-icon-color);
                padding: var(--map-card-internal-predefined-point-icon-padding);
                --mdc-icon-size: calc(
                    var(--map-card-internal-predefined-point-icon-size) -
                        var(--map-card-internal-predefined-point-icon-padding) * 2
                );
                transition: color var(--map-card-internal-transitions-duration) ease,
                    background var(--map-card-internal-transitions-duration) ease;
            }

            .predefined-point-label {
                text-anchor: middle;
                dominant-baseline: middle;
                pointer-events: none;
                transform: translate(
                    calc(var(--offset-x) / var(--map-scale)),
                    calc(var(--offset-y) / var(--map-scale))
                );
                font-size: calc(var(--map-card-internal-predefined-point-label-font-size) / var(--map-scale));
                fill: var(--map-card-internal-predefined-point-label-color);
                transition: color var(--map-card-internal-transitions-duration) ease,
                    background var(--map-card-internal-transitions-duration) ease;
            }

            .predefined-point-wrapper.selected > .predefined-point-icon-wrapper {
                background: var(--map-card-internal-predefined-point-icon-background-color-selected);
                color: var(--map-card-internal-predefined-point-icon-color-selected);
            }

            .predefined-point-wrapper.selected > .predefined-point-label {
                fill: var(--map-card-internal-predefined-point-label-color-selected);
            }
        `;
    }

    public static getFromEntities(
        newMode: MapMode,
        hass: HomeAssistant,
        contextCreator: () => Context,
    ): PredefinedPoint[] {
        return newMode.predefinedSelections
            .map(ps => ps as PredefinedPointConfig)
            .filter(pzc => typeof pzc.position === "string")
            .map(pzc => (pzc.position as string).split(".attributes."))
            .flatMap(z => {
                const entity = hass.states[z[0]];
                const value = z.length === 2 ? entity.attributes[z[1]] : entity.state;
                let parsed;
                try {
                    parsed = JSON.parse(value) as PointType[];
                } catch {
                    parsed = value as PointType[];
                }
                return parsed;
            })
            .map(
                p =>
                    new PredefinedPoint(
                        {
                            position: p,
                            label: undefined,
                            icon: {
                                x: p[0],
                                y: p[1],
                                name: "mdi:map-marker",
                            },
                        },
                        contextCreator(),
                    ),
            );
    }
}
