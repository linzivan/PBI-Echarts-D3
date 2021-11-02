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
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
import VisualObjectInstance = powerbi.VisualObjectInstance;
import DataView = powerbi.DataView;
import VisualObjectInstanceEnumerationObject = powerbi.VisualObjectInstanceEnumerationObject;
import ISelectionManager = powerbi.extensibility.ISelectionManager; //引入图表交互api
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem; //引入图表工具提示api
import { dataColorSettings, VisualSettings } from "./settings";
import * as d3 from "d3";   //引入d3
import { dataViewObjects } from "powerbi-visuals-utils-dataviewutils";

/**
 * 定义数据接口
 */
interface DataPoint {
    category: string;
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
}

export class Visual implements IVisual {
    private settings: VisualSettings;
    // 构造画布
    private host: IVisualHost;  // PBI视觉对象，由可视化对象提供

    private svg: d3.Selection<SVGAElement>;
    private barGroup: d3.Selection<SVGAElement>;
    private viewModel: ViewModel; //导入业务数据
    private xAxisGroup: d3.Selection<SVGElement>;   //定义x轴
    private yAxisGroup: d3.Selection<SVGElement>;   //定义y轴
    private selectionManager: ISelectionManager;     //定义图表交互
    private margin = {      //定义位置
        left: 55,
        right: 20,
        top: 40,
        bottom: 40
    }

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.svg = d3.select(options.element)
            .append("svg")
            .classed("bar-chart", true);

        this.barGroup = this.svg
            .append("g")
            .classed("bar-group", true);

        this.xAxisGroup = this.svg.
            append('g')
            .classed("x-axis", true);

        this.yAxisGroup = this.svg.
            append('g')
            .classed("y-axis", true);

        this.selectionManager = this.host.createSelectionManager();
    }

    public update(options: VisualUpdateOptions) {
        this.settings = Visual.parseSettings(options && options.dataViews && options.dataViews[0]);

        this.viewModel = this.getViewModel(options);

        let width = options.viewport.width;
        let height = options.viewport.height;

        let xAxispadding = this.settings.xAxis.show ? this.margin.bottom : 10;
        let xAxisTextVisible = this.settings.xAxis.show ? "visible" : "hidden";
        // console.log(xAxispadding)

        // svg大小，整个视觉对象大小
        this.svg.attr({
            width: width,
            height: height
        });

        // 比例尺
        let yscale = d3.scale.linear()
            .domain([0, this.viewModel.maxValue])
            .range([height - xAxispadding, 0 + this.margin.top]);

        let xscale = d3.scale.ordinal()
            .domain(this.viewModel.dataPoints.map(d => d.category))
            .rangeRoundBands([0 + this.margin.left, width], 0.5);

        // 绘制坐标轴
        let yAxis = d3.svg.axis()
            .scale(yscale)
            .orient("left")
            .tickSize(1);

        this.yAxisGroup
            .call(yAxis)
            .attr({
                transform: "translate(" + this.margin.left + ",0)"
            })

        let xAxis = d3.svg.axis()
            .scale(xscale)
            .orient("bottom")
            .tickSize(1);

        this.xAxisGroup
            .call(xAxis)
            .attr({
                transform: "translate(0," + (height - xAxispadding) + ")"
            })
            .selectAll("text")
            .style({
                "visibility": xAxisTextVisible
            })
            ;

        // 绘制数据
        let bars = this.barGroup
            .selectAll(".bar")  // selectAll没有的话会进行创建
            .data(this.viewModel.dataPoints);

        bars.enter()
            .append("rect")
            .classed("bar", true);

        bars.attr({
            width: xscale.rangeBand(),
            height: d => height - yscale(d.value) - xAxispadding,
            x: d => xscale(d.category),
            y: d => yscale(d.value),
            fill: d => d.color,
        })
            .style({
                "fill-opacity": d => this.viewModel.highlights ? d.highlighted ? 1.0 : 0.2 : 1.0
            });

        bars.on("click", (d) => {
            this.selectionManager.select(d.selectionId, false)   //第一个参数为选择数据ID，第二个为是否开启多选
                .then(ids => {
                    bars.style({
                        "fill-opacity": ids.length > 0 ?
                            d => ids.indexOf(d.selectionId) >= 0 ? 1.0 : 0.2
                            : 1.0
                    });
                });
        })
            .on("mouseover", (d) => {
                let mouse = d3.mouse(this.svg.node());
                let x = mouse[0];
                let y = mouse[1];
                this.host.tooltipService.show(
                    {
                        dataItems: d.tooltips,
                        identities: [d.category, d.value],
                        coordinates: [x, y],
                        isTouchEvent: false
                    }
                )
            })
            .on("mouseout", d => {
                this.host.tooltipService.hide({
                    immediately: true,
                    isTouchEvent: false
                })
            })
            .on("mouseout", d => {
                this.host.tooltipService.hide({
                    immediately: true,
                    isTouchEvent: false
                })
            })
            .on("mousemove", (d) => {
                let mouse = d3.mouse(this.svg.node());
                let x = mouse[0];
                let y = mouse[1];
                this.host.tooltipService.move(
                    {
                        dataItems: d.tooltips,
                        identities: [d.category, d.value],
                        coordinates: [x, y],
                        isTouchEvent: false
                    }
                )
            });
        bars.exit()
            .remove();

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
        //     public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstanceEnumeration {
        //     let objectName: string = options.objectName;
        //     let objectEnumeration: VisualObjectInstance[] = [];

        //     switch (objectName) {
        //         case 'myCustomObject':
        //             objectEnumeration.push({
        //                 objectName: objectName,
        //                 properties: { ... },
        //                 selector: { ... }
        //             });
        //             break;
        //     };

        //     return objectEnumeration;
        // }
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
            //显示图形默认颜色
            case "dataColor":
                for (let d of this.viewModel.dataPoints) {
                    objectEnumeration.push({
                        objectName: objectName,
                        displayName: d.category,
                        properties: {
                            fill: {
                                solid: {
                                    color: d.color
                                }
                            }
                        },
                        selector: d.selectionId.getSelector()
                    });
                }
                break;
            default: break;
        }

        return objectEnumeration;
    }

    private getViewModel(options: VisualUpdateOptions): ViewModel {
        let dv = options.dataViews;
        let viewModel: ViewModel = {
            dataPoints: [],
            maxValue: 0,
            highlights: false    // 初始化
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
                category: <string>categories.values[i],
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
        // console.log(viewModel);
        viewModel.maxValue = d3.max(viewModel.dataPoints, d => d.value);
        viewModel.highlights = viewModel.dataPoints.filter(
            d => d.highlighted
        ).length > 0;
        return viewModel;
    }
}