import { dataViewObjectsParser } from "powerbi-visuals-utils-dataviewutils";
import DataViewObjectsParser = dataViewObjectsParser.DataViewObjectsParser;
export declare class VisualSettings extends DataViewObjectsParser {
    dataPoint: dataPointSettings;
    xAxis: xAxisSettings;
    dataColor: dataColorSettings;
}
export declare class dataPointSettings {
    defaultColor: string;
    showAllDataPoints: boolean;
    fill: string;
    fillRule: string;
    fontSize: number;
}
export declare class xAxisSettings {
    show: boolean;
}
export declare class dataColorSettings {
    dataColor: string;
}
