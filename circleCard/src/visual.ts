/*
*  Power BI Visual CLI
*
*  Copyright (c) Microsoft Corporation
*  All rights reserved.
*  MIT License
*
*  Permission is hereby granted, free of charge, to any person obtaining a copy
*  of this software and associated documentation files (the ""Software""), to deal
*  in the Software without restriction, including without limitation the rights
*  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
*  copies of the Software, and to permit persons to whom the Software is
*  furnished to do so, subject to the following conditions:
*
*  The above copyright notice and this permission notice shall be included in
*  all copies or substantial portions of the Software.
*
*  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
*  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
*  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
*  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
*  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
*  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
*  THE SOFTWARE.
*/
"use strict";

import "core-js/stable";
import "./../style/visual.less";
import powerbi from "powerbi-visuals-api";
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualHost = powerbi.extensibility.visual.IVisualHost; //引入IVisualHost
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
import ISelectionManager = powerbi.extensibility.ISelectionManager; //引入图表交互api
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem; //引入图表工具提示api
import VisualObjectInstance = powerbi.VisualObjectInstance;
import DataView = powerbi.DataView;
import { dataColorSettings, VisualSettings } from "./settings";   //引入setting.ts文件
import VisualObjectInstanceEnumerationObject = powerbi.VisualObjectInstanceEnumerationObject;
import { dataViewObjects } from "powerbi-visuals-utils-dataviewutils";


import * as echarts from "echarts";     //引入echarts
import * as ecStat from 'echarts-stat'; //引入ecStat分析库

type Array_Data = Array<[number, number]>;

/**
 * 定义数据接口
 */
interface DataPoint {
    category: number;
    value: number;
    color: string;  // 为图表上色
    selectionId: powerbi.visuals.ISelectionId;  //增加数据交互
    highlighted: boolean;    //高亮显示
    tooltips: VisualTooltipDataItem[]; //定义工具提示
}
/**
 * 定义视图接口
 */
interface ViewModel {
    dataPoints: DataPoint[];
    maxValue: number;
    highlights: boolean;
    Array_Data: Array_Data;
    data_color: string[];
    data_name: string[];
}

export class Visual implements IVisual {
    private settings: VisualSettings;
    private target: HTMLElement;
    private viewModel: ViewModel; //导入业务数据
    private host: IVisualHost;  // PBI视觉对象，由可视化对象提供
    private selectionManager: ISelectionManager;     //定义图表交互
    constructor(options: VisualConstructorOptions) {
        this.target = options.element;
        this.host = options.host;
        this.selectionManager = this.host.createSelectionManager();
    }

    public update(options: VisualUpdateOptions) {
        // const ec = echarts as any;
        this.settings = Visual.parseSettings(options && options.dataViews && options.dataViews[0]);
        this.viewModel = this.getViewModel(options);
        let dataBox = options.dataViews[0];
        this.target.innerHTML = `<div id='main' class='line' name='line' style='width:100%;height:100%;'></div>`

        // echarts.registerTransform(ecStat.transform.regression);

        // echart初始化，使用html设置宽度比例
        let myChart = echarts.init(document.getElementById('main'));
        console.log(dataBox.categorical.values[0].source.displayName)
        let myRegression = ecStat.regression('polynomial', this.viewModel.Array_Data, 3);
        // console.log("myRegression.points", myRegression.points)
        let option = {
            color: [this.settings.dataColor.scatter, this.settings.dataColor.line],
            tooltip: {
                // trigger: 'axis' as 'axis',
                trigger: 'item' as 'item',
                axisPointer: {
                    type: 'cross' as 'cross'
                }
                // , formatter: 'x : {c0}<br />y : {c1}'
            },
            title: {
                text: '多项式线性回归',
                left: 'center',
                // top: 16
            },
            // grid: { left: '5%', top: '10%', width: '92%', height: '85%' },
            xAxis: {
                show: this.settings.xAxis.show,
                type: 'value' as 'value',
                min: 0,
                max: 12,
                interval: 1,
                splitLine: {
                    lineStyle: {
                        type: 'dashed' as 'dashed'
                    }
                }
            },
            yAxis: {
                show: this.settings.yAxis.show,
                type: 'value' as 'value',
                // min: -40,
                position: 'left' as 'left',
                max: this.viewModel.maxValue,
                splitLine: {
                    lineStyle: {
                        type: 'dashed' as 'dashed'
                    }
                }
            },
            series: [{
                // name: 'scatter',
                name: dataBox.categorical.values[0].source.displayName,
                type: 'scatter' as 'scatter',
                label: {
                    emphasis: {
                        show: true
                    }
                },
                data: this.viewModel.Array_Data
            }, {
                name: 'line',
                // name: dataBox.categorical.values[0].source.displayName,
                type: 'line' as 'line',
                smooth: true,
                showSymbol: false,
                data: myRegression.points,
                markPoint: {
                    itemStyle: {
                        normal: {
                            color: 'transparent'
                        }
                    },
                    label: {
                        normal: {
                            show: true,
                            position: 'bottom',
                            formatter: myRegression.expression,
                            textStyle: {
                                color: '#333',
                                fontSize: 14
                            }
                        }
                    },
                    data: [{
                        coord: myRegression.points[myRegression.points.length - 1]
                    }]
                }
            }]
        }
        // console.log(options.dataViews[0].categorical.values.source.displayName)
        myChart.setOption(option);
    }

    private static parseSettings(dataView: DataView): VisualSettings {
        return <VisualSettings>VisualSettings.parse(dataView);
    }

    /**
     * This function gets called for each of the objects defined in the capabilities files and allows you to select which of the
     * objects and properties you want to expose to the users in the property pane.
     *
     */
    public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] | VisualObjectInstanceEnumerationObject {
        // return VisualSettings.enumerateObjectInstances(this.settings || VisualSettings.getDefault(), options);
        let objectName = options.objectName;
        let objectEnumeration: VisualObjectInstance[] = [];

        switch (objectName) {
            //显示x坐标轴
            case "xAxis":
                objectEnumeration.push({
                    objectName: objectName,
                    properties: {
                        show: this.settings.xAxis.show
                    },
                    selector: null
                });
                break;
            //显示Y坐标轴
            case "yAxis":
                objectEnumeration.push({
                    objectName: objectName,
                    properties: {
                        show: this.settings.yAxis.show
                    },
                    selector: null
                });
                break;
            //显示图形默认颜色,应该只显示两个图例
            case "dataColor":
                objectEnumeration.push({
                    objectName: objectName,
                    properties: {
                        scatter: {
                            solid: {
                                color: this.settings.dataColor.scatter
                            }
                        },
                        line: {
                            solid: {
                                color: this.settings.dataColor.line
                            }
                        }
                    },
                    selector: null
                });
                break;
            default: break;
        }

        return objectEnumeration;

    }
    /**
     * 从PBI右侧的可视化配置栏中取数据，
     * 
     */
    private getViewModel(options: VisualUpdateOptions): ViewModel {
        let dv = options.dataViews;
        let viewModel: ViewModel = {
            dataPoints: [],
            maxValue: 0,
            highlights: false,    // 初始化
            Array_Data: [],
            data_color: ['#414fb1', '#eb895f'],      // 初始化数据颜色
            data_name: ['实际数据颜色', '拟合曲线颜色'] // 初始化数据名称
        };

        if (!dv
            || !dv[0]
            || !dv[0].categorical
            || !dv[0].categorical.categories
            || !dv[0].categorical.categories[0].source
            || !dv[0].categorical.values
        )
            return viewModel;

        let view = dv[0].categorical;
        let categories = view.categories[0];
        let values = view.values[0];
        let highlights = values.highlights;
        let objects = categories.objects;

        // let colorPalette:IColorPalette = this.host.colorPalette; //host:IVisualHost
        for (let i = 0, len = Math.max(categories.values.length, values.values.length); i < len; i++) {
            viewModel.dataPoints.push({
                category: <number>categories.values[i],
                value: <number>values.values[i],
                color: objects && objects[i] && dataViewObjects.getFillColor(
                    objects[i],
                    {
                        objectName: "dataColor",
                        propertyName: "fill"
                    },
                    null
                )
                    || this.host.colorPalette.getColor(<string>categories.values[i]).value,
                selectionId: this.host.createSelectionIdBuilder()
                    .withCategory(categories, i)
                    .createSelectionId(),
                highlighted: highlights ? highlights[i] ? true : false : false,
                tooltips: [
                    {
                        displayName: categories.source.displayName + ":",
                        value: <string>categories.values[i]
                    },
                    {
                        displayName: values.source.displayName + ":",
                        value: (<number>values.values[i]).toString()
                    }
                ]
            })
        };
        // 构建二维数组
        for (let i = 0, len = Math.max(categories.values.length, values.values.length); i < len; i++) {
            viewModel.Array_Data.push([<number>categories.values[i], <number>values.values[i]])
        }
        // 取数据最大值，确定y轴上限
        viewModel.maxValue = <number>values.maxLocal * 1.2;

        return viewModel;
    }
}