/**
 * 数据处理模块
 * 包含景点坐标获取、距离计算、坐标验证等数据处理功能
 */

/**
 * 获取景点坐标数据
 * @param {string} cityName - 城市名称
 * @param {Array} attractions - 景点列表
 * @returns {Promise<Array>} 包含坐标信息的景点数据
 */
async function getAttractionCoordinates(cityName, attractions) {
    const attractionsWithGeoData = [];
    
    // 模拟坐标数据作为降级方案
    const fallbackCoordinates = {
        '上海': {
            '上海博物馆': [121.4737, 31.2304],
            '外滩': [121.4916, 31.2397],
            '东方明珠': [121.5067, 31.2397],
            '豫园': [121.4925, 31.2267],
            '南京路步行街': [121.4737, 31.2304],
            '田子坊': [121.4663, 31.2108],
            '新天地': [121.4737, 31.2197],
            '朱家角古镇': [121.0517, 31.1078]
        },
        '北京': {
            '故宫': [116.3974, 39.9163],
            '天安门广场': [116.3974, 39.9042],
            '长城': [116.5704, 40.4319],
            '颐和园': [116.2732, 39.9990],
            '天坛': [116.4074, 39.8836]
        },
        '杭州': {
            '西湖': [120.1551, 30.2741],
            '灵隐寺': [120.1019, 30.2408],
            '雷峰塔': [120.1489, 30.2316],
            '断桥': [120.1551, 30.2741]
        }
    };
    
    try {
        // 尝试加载高德地图API
        let AMap = null;
        let placeSearch = null;
        let apiAvailable = false;
        
        try {
            AMap = await new Promise((resolve, reject) => {
                if (window.AMapLoader) {
                    window.AMapLoader.load({
                        key: 'a7dd919baf2818a9b9fd7cbdeadba786',
                        version: '2.0',
                        plugins: ['AMap.PlaceSearch', 'AMap.Geocoder', 'AMap.Weather']
                    }).then(resolve).catch(reject);
                } else {
                    reject(new Error('高德地图加载器未找到'));
                }
            });

            // 创建地点搜索实例
            placeSearch = new AMap.PlaceSearch({
                city: cityName,
                citylimit: true,
                pageSize: 1
            });
            
            apiAvailable = true;
            console.log('✅ 高德地图API加载成功');
        } catch (apiError) {
            console.warn('⚠️ 高德地图API加载失败，将使用模拟坐标数据:', apiError);
            apiAvailable = false;
        }

        // 为每个景点搜索坐标
        for (const attraction of attractions) {
            let coordinatesFound = false;
            
            // 首先尝试使用高德地图API
            if (apiAvailable && placeSearch) {
                try {
                    const searchResult = await new Promise((resolve, reject) => {
                        placeSearch.search(attraction, (status, result) => {
                            if (status === 'complete' && result.poiList && result.poiList.pois.length > 0) {
                                resolve(result.poiList.pois[0]);
                            } else {
                                reject(new Error(`未找到景点: ${attraction}`));
                            }
                        });
                    });

                    attractionsWithGeoData.push({
                        name: attraction,
                        coordinates: [searchResult.location.lng, searchResult.location.lat],
                        address: searchResult.address || `${cityName}${attraction}`,
                        district: searchResult.adname || '',
                        type: searchResult.type || '',
                        source: 'amap'
                    });

                    console.log(`✅ 通过API找到景点坐标: ${attraction}`, [searchResult.location.lng, searchResult.location.lat]);
                    coordinatesFound = true;

                } catch (searchError) {
                    console.warn(`⚠️ API搜索失败: ${attraction}`, searchError);
                }
            }
            
            // 如果API搜索失败，使用模拟坐标数据
            if (!coordinatesFound) {
                const cityFallback = fallbackCoordinates[cityName];
                if (cityFallback && cityFallback[attraction]) {
                    attractionsWithGeoData.push({
                        name: attraction,
                        coordinates: cityFallback[attraction],
                        address: `${cityName}${attraction}`,
                        district: cityName,
                        type: '旅游景点',
                        source: 'fallback'
                    });
                    
                    console.log(`✅ 使用模拟坐标: ${attraction}`, cityFallback[attraction]);
                    coordinatesFound = true;
                } else {
                    // 生成基于城市中心的随机坐标
                    const cityCenter = getCityCenter(cityName);
                    const randomOffset = () => (Math.random() - 0.5) * 0.02; // 约1-2公里范围内
                    const fallbackCoords = [
                        cityCenter[0] + randomOffset(),
                        cityCenter[1] + randomOffset()
                    ];
                    
                    attractionsWithGeoData.push({
                        name: attraction,
                        coordinates: fallbackCoords,
                        address: `${cityName}${attraction}`,
                        district: cityName,
                        type: '旅游景点',
                        source: 'generated'
                    });
                    
                    console.log(`✅ 生成模拟坐标: ${attraction}`, fallbackCoords);
                }
            }
        }

        console.log('景点坐标获取完成:', attractionsWithGeoData);
        return attractionsWithGeoData;

    } catch (error) {
        console.error('景点坐标获取过程出错:', error);
        
        // 即使出错也要返回基本数据，确保流程不中断
        const emergencyData = attractions.map(attraction => {
            const cityCenter = getCityCenter(cityName);
            const randomOffset = () => (Math.random() - 0.5) * 0.02;
            
            return {
                name: attraction,
                coordinates: [
                    cityCenter[0] + randomOffset(),
                    cityCenter[1] + randomOffset()
                ],
                address: `${cityName}${attraction}`,
                district: cityName,
                type: '旅游景点',
                source: 'emergency'
            };
        });
        
        console.log('使用紧急模拟数据:', emergencyData);
        return emergencyData;
    }
}

/**
 * 获取城市中心坐标的辅助函数
 * @param {string} cityName - 城市名称
 * @returns {Array} 城市中心坐标 [经度, 纬度]
 */
function getCityCenter(cityName) {
    const cityCenters = {
        '上海': [121.4737, 31.2304],
        '北京': [116.4074, 39.9042],
        '杭州': [120.1551, 30.2741],
        '广州': [113.2644, 23.1291],
        '深圳': [114.0579, 22.5431],
        '成都': [104.0668, 30.5728],
        '西安': [108.9402, 34.3416],
        '南京': [118.7969, 32.0603],
        '武汉': [114.3054, 30.5931],
        '重庆': [106.5516, 29.5630]
    };
    
    return cityCenters[cityName] || [116.4074, 39.9042]; // 默认北京
}

/**
 * 计算景点间距离矩阵
 * @param {Array} attractionsWithGeoData - 包含坐标的景点数据
 * @returns {Promise<Object>} 距离矩阵对象
 */
async function calculateDistanceMatrix(attractionsWithGeoData) {
    const distanceMatrix = {};
    
    try {
        // 加载高德地图API
        const AMap = await new Promise((resolve, reject) => {
            if (window.AMapLoader) {
                window.AMapLoader.load({
                    key: 'a7dd919baf2818a9b9fd7cbdeadba786',
                    version: '2.0',
                    plugins: ['AMap.Driving', 'AMap.Walking', 'AMap.Transfer']
                }).then(resolve).catch(reject);
            } else {
                reject(new Error('高德地图加载器未找到'));
            }
        });

        // 创建驾车路线规划实例
        const driving = new AMap.Driving({
            policy: AMap.DrivingPolicy.LEAST_TIME
        });

        // 创建步行路线规划实例
        const walking = new AMap.Walking();

        // 计算所有景点间的距离和时间
        for (let i = 0; i < attractionsWithGeoData.length; i++) {
            const fromAttraction = attractionsWithGeoData[i];
            distanceMatrix[fromAttraction.name] = {};

            for (let j = 0; j < attractionsWithGeoData.length; j++) {
                if (i === j) {
                    distanceMatrix[fromAttraction.name][attractionsWithGeoData[j].name] = {
                        distance: 0,
                        duration: 0,
                        drivingDuration: 0,
                        walkingDuration: 0,
                        transportMode: 'same'
                    };
                    continue;
                }

                const toAttraction = attractionsWithGeoData[j];
                
                try {
                    // 计算直线距离
                    const straightDistance = calculateStraightDistance(
                        fromAttraction.coordinates, 
                        toAttraction.coordinates
                    );

                    // 计算驾车路线
                    const drivingResult = await new Promise((resolve, reject) => {
                        driving.search(fromAttraction.coordinates, toAttraction.coordinates, (status, result) => {
                            if (status === 'complete' && result.routes && result.routes.length > 0) {
                                resolve(result.routes[0]);
                            } else {
                                reject(new Error('驾车路线计算失败'));
                            }
                        });
                    });

                    // 计算步行路线
                    const walkingResult = await new Promise((resolve, reject) => {
                        walking.search(fromAttraction.coordinates, toAttraction.coordinates, (status, result) => {
                            if (status === 'complete' && result.routes && result.routes.length > 0) {
                                resolve(result.routes[0]);
                            } else {
                                reject(new Error('步行路线计算失败'));
                            }
                        });
                    });

                    // 确定推荐的交通方式
                    let recommendedTransport = 'driving';
                    let recommendedDuration = drivingResult.time;
                    
                    if (walkingResult.time <= 1800) { // 30分钟内步行
                        recommendedTransport = 'walking';
                        recommendedDuration = walkingResult.time;
                    } else if (drivingResult.time <= 900) { // 15分钟内驾车
                        recommendedTransport = 'driving';
                    } else {
                        recommendedTransport = 'public'; // 推荐公共交通
                    }

                    distanceMatrix[fromAttraction.name][toAttraction.name] = {
                        distance: drivingResult.distance,
                        duration: recommendedDuration,
                        drivingDuration: drivingResult.time,
                        walkingDuration: walkingResult.time,
                        transportMode: recommendedTransport,
                        straightDistance: straightDistance
                    };

                    console.log(`✅ 计算路线: ${fromAttraction.name} → ${toAttraction.name}`, {
                        distance: `${(drivingResult.distance / 1000).toFixed(1)}km`,
                        driving: `${Math.round(drivingResult.time / 60)}分钟`,
                        walking: `${Math.round(walkingResult.time / 60)}分钟`,
                        recommended: recommendedTransport
                    });

                } catch (error) {
                    console.warn(`⚠️ 无法计算路线: ${fromAttraction.name} → ${toAttraction.name}`, error);
                    
                    // 使用直线距离估算
                    const straightDistance = calculateStraightDistance(
                        fromAttraction.coordinates, 
                        toAttraction.coordinates
                    );
                    
                    const estimatedDrivingTime = Math.max(300, straightDistance * 0.1); // 估算驾车时间
                    const estimatedWalkingTime = straightDistance * 0.8; // 估算步行时间
                    
                    distanceMatrix[fromAttraction.name][toAttraction.name] = {
                        distance: straightDistance,
                        duration: estimatedDrivingTime,
                        drivingDuration: estimatedDrivingTime,
                        walkingDuration: estimatedWalkingTime,
                        transportMode: straightDistance < 2000 ? 'walking' : 'driving',
                        straightDistance: straightDistance,
                        estimated: true
                    };
                }
            }
        }

        console.log('距离矩阵计算完成:', distanceMatrix);
        return distanceMatrix;

    } catch (error) {
        console.error('距离矩阵计算失败，使用估算数据:', error);
        
        // 降级到简单估算
        for (let i = 0; i < attractionsWithGeoData.length; i++) {
            const fromAttraction = attractionsWithGeoData[i];
            distanceMatrix[fromAttraction.name] = {};

            for (let j = 0; j < attractionsWithGeoData.length; j++) {
                const toAttraction = attractionsWithGeoData[j];
                
                if (i === j) {
                    distanceMatrix[fromAttraction.name][toAttraction.name] = {
                        distance: 0,
                        duration: 0,
                        transportMode: 'same'
                    };
                } else {
                    const straightDistance = calculateStraightDistance(
                        fromAttraction.coordinates, 
                        toAttraction.coordinates
                    );
                    
                    distanceMatrix[fromAttraction.name][toAttraction.name] = {
                        distance: straightDistance,
                        duration: Math.max(300, straightDistance * 0.1),
                        transportMode: straightDistance < 2000 ? 'walking' : 'driving',
                        estimated: true
                    };
                }
            }
        }
        
        return distanceMatrix;
    }
}

/**
 * 计算两点间直线距离（米）
 * @param {Array} coord1 - 第一个坐标 [经度, 纬度]
 * @param {Array} coord2 - 第二个坐标 [经度, 纬度]
 * @returns {number} 直线距离（米）
 */
function calculateStraightDistance(coord1, coord2) {
    const R = 6371000; // 地球半径（米）
    const lat1 = coord1[1] * Math.PI / 180;
    const lat2 = coord2[1] * Math.PI / 180;
    const deltaLat = (coord2[1] - coord1[1]) * Math.PI / 180;
    const deltaLng = (coord2[0] - coord1[0]) * Math.PI / 180;

    const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLng/2) * Math.sin(deltaLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
}

/**
 * 验证和格式化坐标
 * @param {Array|Object} coordinates - 坐标数据
 * @param {string} context - 上下文信息，用于调试
 * @returns {Array|null} 格式化后的坐标 [经度, 纬度] 或 null
 */
function validateAndFormatCoordinates(coordinates, context = '') {
    try {
        let lng, lat;
        
        // 处理不同格式的坐标输入
        if (Array.isArray(coordinates)) {
            if (coordinates.length >= 2) {
                lng = coordinates[0];
                lat = coordinates[1];
            } else {
                console.error(`❌ 坐标数组长度不足 (${context}):`, coordinates);
                return null;
            }
        } else if (coordinates && typeof coordinates === 'object') {
            // 处理对象格式的坐标
            if (coordinates.lng !== undefined && coordinates.lat !== undefined) {
                lng = coordinates.lng;
                lat = coordinates.lat;
            } else if (coordinates.longitude !== undefined && coordinates.latitude !== undefined) {
                lng = coordinates.longitude;
                lat = coordinates.latitude;
            } else if (coordinates.x !== undefined && coordinates.y !== undefined) {
                lng = coordinates.x;
                lat = coordinates.y;
            } else {
                console.error(`❌ 坐标对象格式无效 (${context}):`, coordinates);
                return null;
            }
        } else {
            console.error(`❌ 坐标格式无效 (${context}):`, coordinates);
            return null;
        }
        
        // 转换为数字类型
        lng = Number(lng);
        lat = Number(lat);
        
        // 验证坐标有效性
        if (isNaN(lng) || isNaN(lat)) {
            console.error(`❌ 坐标包含非数字值 (${context}):`, { lng, lat, original: coordinates });
            return null;
        }
        
        if (!isFinite(lng) || !isFinite(lat)) {
            console.error(`❌ 坐标包含无限值 (${context}):`, { lng, lat, original: coordinates });
            return null;
        }
        
        // 验证坐标范围（中国境内大致范围）
        if (lng < 73 || lng > 135 || lat < 3 || lat > 54) {
            console.warn(`⚠️ 坐标超出中国境内范围 (${context}):`, { lng, lat });
            // 不返回null，因为可能是海外景点
        }
        
        // 验证坐标精度（避免过于粗糙的坐标）
        const lngStr = lng.toString();
        const latStr = lat.toString();
        const lngDecimals = lngStr.includes('.') ? lngStr.split('.')[1].length : 0;
        const latDecimals = latStr.includes('.') ? latStr.split('.')[1].length : 0;
        
        if (lngDecimals < 2 || latDecimals < 2) {
            console.warn(`⚠️ 坐标精度较低 (${context}):`, { lng, lat, lngDecimals, latDecimals });
        }
        
        console.log(`✅ 坐标验证通过 (${context}):`, [lng, lat]);
        return [lng, lat];
        
    } catch (error) {
        console.error(`❌ 坐标验证过程出错 (${context}):`, error, coordinates);
        return null;
    }
}

/**
 * 安全创建高德地图LngLat对象
 * @param {Array} coordinates - 坐标 [经度, 纬度]
 * @param {string} context - 上下文信息，用于调试
 * @returns {AMap.LngLat|null} 高德地图坐标对象或null
 */
function createSafeLngLat(coordinates, context = '') {
    try {
        if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 2) {
            console.error(`❌ 无效坐标数据 (${context}):`, coordinates);
            return null;
        }
        
        const [lng, lat] = coordinates;
        
        if (typeof AMap === 'undefined' || !AMap.LngLat) {
            console.error(`❌ 高德地图API未加载 (${context})`);
            return null;
        }
        
        const lngLat = new AMap.LngLat(lng, lat);
        console.log(`✅ 成功创建LngLat对象 (${context}):`, lngLat);
        return lngLat;
        
    } catch (error) {
        console.error(`❌ 创建LngLat对象失败 (${context}):`, error, coordinates);
        return null;
    }
}