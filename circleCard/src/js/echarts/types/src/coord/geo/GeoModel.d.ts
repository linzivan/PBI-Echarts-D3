import ComponentModel from '../../model/Component';
import Model from '../../model/Model';
import Geo from './Geo';
import { ComponentOption, BoxLayoutOptionMixin, ItemStyleOption, ZRColor, LabelOption, DisplayState, RoamOptionMixin, AnimationOptionMixin, StatesOptionMixin, Dictionary, CommonTooltipOption, StatesMixinBase } from '../../util/types';
import { NameMap } from './geoTypes';
import GlobalModel from '../../model/Global';
export interface GeoItemStyleOption<TCbParams = never> extends ItemStyleOption<TCbParams> {
    areaColor?: ZRColor;
}
interface GeoLabelOption extends LabelOption {
    formatter?: string | ((params: GeoLabelFormatterDataParams) => string);
}
export interface GeoStateOption {
    itemStyle?: GeoItemStyleOption;
    label?: GeoLabelOption;
}
interface GeoLabelFormatterDataParams {
    name: string;
    status: DisplayState;
}
export interface RegoinOption extends GeoStateOption, StatesOptionMixin<GeoStateOption, StatesMixinBase> {
    name?: string;
    selected?: boolean;
    tooltip?: CommonTooltipOption<GeoTooltipFormatterParams>;
}
export interface GeoTooltipFormatterParams {
    componentType: 'geo';
    geoIndex: number;
    name: string;
    $vars: ['name'];
}
export interface GeoCommonOptionMixin extends RoamOptionMixin {
    map: string;
    aspectScale?: number;
    layoutCenter?: (number | string)[];
    layoutSize?: number | string;
    boundingCoords?: number[][];
    nameMap?: NameMap;
    nameProperty?: string;
}
export interface GeoOption extends ComponentOption, BoxLayoutOptionMixin, AnimationOptionMixin, GeoCommonOptionMixin, StatesOptionMixin<GeoStateOption, StatesMixinBase>, GeoStateOption {
    mainType?: 'geo';
    show?: boolean;
    silent?: boolean;
    regions?: RegoinOption[];
    stateAnimation?: AnimationOptionMixin;
    selectedMode?: 'single' | 'multiple' | boolean;
    selectedMap?: Dictionary<boolean>;
    tooltip?: CommonTooltipOption<GeoTooltipFormatterParams>;
}
declare class GeoModel extends ComponentModel<GeoOption> {
    static type: string;
    readonly type: string;
    coordinateSystem: Geo;
    static layoutMode: "box";
    private _optionModelMap;
    static defaultOption: GeoOption;
    init(option: GeoOption, parentModel: Model, ecModel: GlobalModel): void;
    optionUpdated(): void;
    /**
     * Get model of region.
     */
    getRegionModel(name: string): Model<RegoinOption>;
    /**
     * Format label
     * @param name Region name
     */
    getFormattedLabel(name: string, status?: DisplayState): string;
    setZoom(zoom: number): void;
    setCenter(center: number[]): void;
    select(name?: string): void;
    unSelect(name?: string): void;
    toggleSelected(name?: string): void;
    isSelected(name?: string): boolean;
}
export default GeoModel;
