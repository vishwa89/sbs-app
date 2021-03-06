﻿/// <reference path="../tsdef/jquery.d.ts"/>
/// <reference path="../tsdef/knockout-3.3.d.ts"/>
/// <reference path="../tsdef/google.maps.d.ts"/>
/// <reference path="../extensions.ts"/>
/// <reference path="../stopbystop-interfaces.ts"/>
/// <reference path="../Init.ts"/>
/// <reference path="RouteViewModel.ts"/>
/// <reference path="JunctionMapViewModel.ts"/>
/// <reference path="IAppViewModel.ts"/>

"use strict";
module StopByStop {

    export abstract class JunctionAppBaseViewModel implements IAppViewModel {
        protected _poiLocations: LocationViewModel[];
        protected _locationToLoadIndex: number = 0;

        public filter: FilterViewModel;
        public routePlan: RoutePlanViewModel;
        public routeJunction: RouteJunctionViewModel;
        public junctionMapViewModel: JunctionMapViewModel;

        protected loadFullPoiData() {
            if (this._locationToLoadIndex < this._poiLocations.length) {
                var locationToLoad = this._poiLocations[this._locationToLoadIndex++];

                var latStr = locationToLoad.lat.toFixed(1);
                var lonStr = locationToLoad.lon.toFixed(1);

                $.ajax(AppState.current.urls.PoiUrl + latStr + "," + lonStr)
                    .done((data: IPoi[]) => {

                        for (var i = 0; i < data.length; i++) {
                            var p = data[i];
                            if (this.routeJunction.junction.poiLookup[p.id]) {
                                this.routeJunction.junction.poiLookup[p.id].poi.updateYInfo(p);
                            }
                        }

                        this.loadFullPoiData();
                    });
            }
        }

    };

    export class JunctionSPAAppViewModel extends JunctionAppBaseViewModel {
        constructor(
            route: IRoute,
            routeJunctionViewModel: RouteJunctionViewModel,
            parentFilter: FilterViewModel,
            routePlan: RoutePlanViewModel,
            poiTypeToShow: PoiType = PoiType.General
        ) {
            super();
            // TODO: here

            this.routePlan = routePlan;
            this.routeJunction = routeJunctionViewModel;
            this.filter = new FilterViewModel(
                parentFilter.routeId,
                [this.routeJunction.routeJunction],
                route.fcat,
                route.tfcat,
                false);

            // propagate distance and restaurant enablement setting from parent route filter
            this.filter.maxDistanceFromJunction(parentFilter.maxDistanceFromJunction());
            var mdarr = [
                [this.filter.maxDistanceFromJunctionIs1, "1"],
                [this.filter.maxDistanceFromJunctionIs2, "2"],
                [this.filter.maxDistanceFromJunctionIs3, "3"],
                [this.filter.maxDistanceFromJunctionIs4, "4"],
                [this.filter.maxDistanceFromJunctionIs5, "5"]
            ];

            for (var i = 0; i < mdarr.length; i++) {
                (<KnockoutObservable<boolean>>mdarr[i][0])(mdarr[i][1] === parentFilter.maxDistanceFromJunction());
            }

            $.each(this.filter.foodCategoriesEnablement(), (index: number, item: ICategoryEnablement) => {
                item.visible(parentFilter.foodCategoriesEnablementLookup[item.category.sbsid].visible());
            });

            if (poiTypeToShow === PoiType.Food) {
                this.filter.showGasStations(false);
            } else if (poiTypeToShow === PoiType.Gas) {
                this.filter.showRestaurants(false);
            }

            var junctionLocationViewModel = this.routeJunction.junction.location;

            this._poiLocations = LocationViewModel.getGridLocations({
                a: junctionLocationViewModel.lat,
                o: junctionLocationViewModel.lon
            });

            this.loadFullPoiData();

            this.routeJunction.applyFilter(this.filter);

            ko.computed(() => ko.toJS(this.filter)).subscribe(() => {
                this.routeJunction.applyFilter(this.filter);
            });
            
        };

        public initMap(mapDiv: Element, mapContainerDiv: Element): JunctionMapViewModel {
            this.junctionMapViewModel = new JunctionMapViewModel(mapDiv, mapContainerDiv, this.routeJunction, AppState.current.urls);
            return this.junctionMapViewModel;
        }
    }
}