/**
 * 地图相关功能模块
 * 包含高德地图的初始化、标记管理、路线规划等功能
 */

// 地图相关的全局变量
let mapInstance = null;
let currentMarkers = [];
let drivingRoute = null;

// 全局景点坐标缓存 - 供所有模块使用
window.attractionCoordinates = {};

// 默认城市坐标常量
const DEFAULT_CITY_COORDINATES = {
    '北京': [116.397428, 39.90923],
    '上海': [121.473701, 31.230416],
    '广州': [113.280637, 23.125178],
    '深圳': [114.085947, 22.547],
    '杭州': [120.153576, 30.287459],
    '南京': [118.767413, 32.041544],
    '武汉': [114.298572, 30.584355],
    '成都': [104.065735, 30.659462],
    '重庆': [106.504962, 29.533155],
    '西安': [108.948024, 34.263161],
    '天津': [117.190182, 39.125596],
    '苏州': [120.619585, 31.299379],
    '青岛': [120.355173, 36.082982],
    '大连': [121.618622, 38.91459],
    '宁波': [121.549792, 29.868388],
    '厦门': [118.11022, 24.490474],
    '福州': [119.306239, 26.075302],
    '济南': [117.000923, 36.675807],
    '长沙': [112.982279, 28.19409],
    '郑州': [113.665412, 34.757975],
    '石家庄': [114.502461, 38.045474],
    '太原': [112.549248, 37.857014],
    '沈阳': [123.429096, 41.796767],
    '长春': [125.3245, 43.886841],
    '哈尔滨': [126.642464, 45.756967],
    '昆明': [102.712251, 25.040609],
    '贵阳': [106.713478, 26.578343],
    '南宁': [108.320004, 22.82402],
    '海口': [110.35069, 20.031971],
    '三亚': [109.508268, 18.247872],
    '拉萨': [91.132212, 29.660361],
    '乌鲁木齐': [87.617733, 43.792818],
    '银川': [106.278179, 38.46637],
    '西宁': [101.778916, 36.623178],
    '兰州': [103.823557, 36.058039],
    '呼和浩特': [111.670801, 40.818311],
    '香港': [114.173355, 22.320048],
    '澳门': [113.54909, 22.198951],
    '台北': [121.565418, 25.032969]
};

/**
 * 获取城市默认坐标
 * @param {string} cityName - 城市名称
 * @returns {Array|null} 坐标数组 [经度, 纬度] 或 null
 */
function getCityDefaultCoordinates(cityName) {
    // 尝试精确匹配
    if (DEFAULT_CITY_COORDINATES[cityName]) {
        return DEFAULT_CITY_COORDINATES[cityName];
    }
    
    // 尝试模糊匹配（去掉"市"等后缀）
    const cleanCityName = cityName.replace(/[市县区]/g, '');
    for (const [key, value] of Object.entries(DEFAULT_CITY_COORDINATES)) {
        if (key.includes(cleanCityName) || cleanCityName.includes(key)) {
            return value;
        }
    }
    
    return null;
}

/**
 * 获取最优缩放级别
 * @param {string} cityName - 城市名称
 * @param {number} attractionCount - 景点数量
 * @returns {number} 缩放级别
 */
function getOptimalZoomLevel(cityName, attractionCount = 0) {
    // 根据城市规模和景点数量确定缩放级别
    const majorCities = ['北京', '上海', '广州', '深圳'];
    const largeCities = ['杭州', '南京', '武汉', '成都', '重庆', '西安'];
    
    if (majorCities.includes(cityName)) {
        return attractionCount > 5 ? 11 : 12;
    } else if (largeCities.includes(cityName)) {
        return attractionCount > 5 ? 12 : 13;
    } else {
        return attractionCount > 5 ? 13 : 14;
    }
}

/**
 * 安全的Base64编码
 * @param {string} str - 要编码的字符串
 * @returns {string} Base64编码后的字符串
 */
function safeBase64Encode(str) {
    try {
        // 使用 btoa 进行 Base64 编码，处理中文字符
        return btoa(unescape(encodeURIComponent(str)));
    } catch (error) {
        console.error('Base64编码失败:', error);
        // 返回一个默认的空SVG
        return btoa('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><circle cx="12" cy="12" r="8" fill="#ff4757"/></svg>');
    }
}

/**
 * 带重试机制的地图初始化
 * @param {string} destination - 目的地
 * @param {Array} itinerary - 行程数据
 * @param {number} maxRetries - 最大重试次数
 */
async function initializeMapWithRetry(destination, itinerary = [], maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🗺️ 地图初始化尝试 ${attempt}/${maxRetries}`);
            await initializeMap(destination, itinerary);
            console.log('✅ 地图初始化成功');
            return;
        } catch (error) {
            console.error(`❌ 地图初始化失败 (尝试 ${attempt}/${maxRetries}):`, error);
            if (attempt === maxRetries) {
                console.error('❌ 地图初始化最终失败，已达到最大重试次数');
                throw error;
            }
            // 等待一段时间后重试
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
}

/**
 * 初始化高德地图
 * @param {string} destination - 目的地
 * @param {Array} itinerary - 行程数据
 */
async function initializeMap(destination, itinerary = []) {
    console.log('🗺️ 开始初始化地图，目的地:', destination);
    
    // 清除现有地图实例
    if (mapInstance) {
        try {
            mapInstance.destroy();
            mapInstance = null;
            console.log('🧹 已清除旧地图实例');
        } catch (error) {
            console.warn('⚠️ 清除旧地图实例时出错:', error);
            mapInstance = null;
        }
    }

    return new Promise((resolve, reject) => {
        // 检查高德地图API是否已加载
        if (typeof AMap === 'undefined') {
            console.log('📦 高德地图API未加载，开始加载...');
            
            // 动态加载高德地图API
            const script = document.createElement('script');
            script.src = 'https://webapi.amap.com/maps?v=1.4.15&key=c7e7b7b8b8b8b8b8b8b8b8b8b8b8b8b8&plugin=AMap.Geocoder,AMap.Driving';
            script.async = true;
            
            script.onload = () => {
                console.log('✅ 高德地图API加载成功');
                initMapInstance();
            };
            
            script.onerror = (error) => {
                console.error('❌ 高德地图API加载失败:', error);
                reject(new Error('高德地图API加载失败'));
            };
            
            document.head.appendChild(script);
        } else {
            console.log('✅ 高德地图API已存在');
            initMapInstance();
        }

        async function initMapInstance() {
            try {
                console.log('🗺️ 开始创建地图实例');
                
                // 获取城市中心坐标
                let cityCenter;
                
                // 方案1: 使用地理编码获取精确坐标
                try {
                    console.log('🔍 尝试通过地理编码获取城市坐标');
                    const geocoder = new AMap.Geocoder({
                        city: destination,
                        radius: 1000,
                        extensions: 'all'
                    });
                    
                    const geocodeResult = await new Promise((geocodeResolve, geocodeReject) => {
                        geocoder.getLocation(destination, (status, result) => {
                            if (status === 'complete' && result.geocodes && result.geocodes.length > 0) {
                                const location = result.geocodes[0].location;
                                console.log('✅ 地理编码成功获取坐标:', location);
                                geocodeResolve([location.lng, location.lat]);
                            } else {
                                console.warn('⚠️ 地理编码失败:', status, result);
                                geocodeReject(new Error('地理编码失败'));
                            }
                        });
                    });
                    
                    cityCenter = geocodeResult;
                    console.log('✅ 使用地理编码坐标:', cityCenter);
                    
                } catch (geocodeError) {
                    console.warn('⚠️ 地理编码失败，尝试使用默认坐标:', geocodeError);
                    
                    // 方案2: 使用预设的默认坐标
                    cityCenter = getCityDefaultCoordinates(destination);
                    
                    if (cityCenter) {
                        console.log('✅ 使用默认坐标:', cityCenter);
                    } else {
                        console.warn('⚠️ 未找到默认坐标，使用北京坐标');
                        cityCenter = [116.397428, 39.90923]; // 北京坐标作为最后备选
                    }
                }

                // 验证坐标有效性
                if (!Array.isArray(cityCenter) || cityCenter.length !== 2 || 
                    isNaN(cityCenter[0]) || isNaN(cityCenter[1])) {
                    throw new Error('无效的城市中心坐标: ' + JSON.stringify(cityCenter));
                }

                console.log('🗺️ 最终使用的城市中心坐标:', cityCenter);

                // 创建地图实例
                const mapContainer = document.getElementById('map');
                if (!mapContainer) {
                    throw new Error('地图容器元素不存在');
                }

                // 确保地图容器有合适的尺寸
                if (mapContainer.offsetWidth === 0 || mapContainer.offsetHeight === 0) {
                    mapContainer.style.width = '100%';
                    mapContainer.style.height = '400px';
                    console.log('📐 设置地图容器默认尺寸');
                }

                // 计算最优缩放级别
                const attractionCount = itinerary.reduce((count, day) => {
                    return count + day.activities.filter(activity => activity.type === 'attraction').length;
                }, 0);
                
                const zoomLevel = getOptimalZoomLevel(destination, attractionCount);
                console.log('🔍 计算缩放级别:', zoomLevel, '景点数量:', attractionCount);

                mapInstance = new AMap.Map('map', {
                    zoom: zoomLevel,
                    center: cityCenter,
                    mapStyle: 'amap://styles/normal',
                    features: ['bg', 'road', 'building', 'point'],
                    viewMode: '2D'
                });

                console.log('✅ 地图实例创建成功');

                // 添加城市标记
                addCityMarker(destination, cityCenter);

                // 如果有行程数据，处理行程相关的地图显示
                if (itinerary && itinerary.length > 0) {
                    console.log('📍 开始处理行程数据，天数:', itinerary.length);
                    
                    // 收集所有景点
                    const allAttractions = [];
                    itinerary.forEach(dayPlan => {
                        dayPlan.activities.forEach(activity => {
                            if (activity.type === 'attraction') {
                                allAttractions.push(activity.name);
                            }
                        });
                    });

                    console.log('📍 收集到的景点:', allAttractions);

                    if (allAttractions.length > 0) {
                        try {
                            // 获取景点坐标
                            console.log('🔍 开始获取景点坐标');
                            window.attractionCoordinates[destination] = await getAttractionCoordinates(destination, allAttractions);
        console.log('✅ 景点坐标获取完成:', window.attractionCoordinates[destination]);

                            // 创建按天分组的路线
                            createDailyRoutes(destination, itinerary);
                        } catch (coordError) {
                            console.error('❌ 获取景点坐标失败:', coordError);
                            // 即使坐标获取失败，也不影响基础地图显示
                        }
                    }
                }

                // 地图加载完成事件
                mapInstance.on('complete', () => {
                    console.log('✅ 地图加载完成');
                    resolve();
                });

                // 地图加载失败事件
                mapInstance.on('error', (error) => {
                    console.error('❌ 地图加载失败:', error);
                    reject(error);
                });

            } catch (error) {
                console.error('❌ 地图实例创建失败:', error);
                
                // 提供详细的错误分析
                let errorMessage = '地图初始化失败';
                if (error.message.includes('坐标')) {
                    errorMessage += '：坐标获取失败，请检查城市名称是否正确';
                } else if (error.message.includes('容器')) {
                    errorMessage += '：地图容器不存在，请检查页面结构';
                } else if (error.message.includes('API')) {
                    errorMessage += '：地图API加载失败，请检查网络连接';
                } else {
                    errorMessage += '：' + error.message;
                }
                
                // 在地图容器中显示错误信息
                const mapContainer = document.getElementById('map');
                if (mapContainer) {
                    mapContainer.innerHTML = `
                        <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #f5f5f5; color: #666; text-align: center; padding: 20px;">
                            <div>
                                <div style="font-size: 48px; margin-bottom: 16px;">🗺️</div>
                                <div style="font-size: 16px; margin-bottom: 8px;">${errorMessage}</div>
                                <div style="font-size: 12px; opacity: 0.7;">请稍后重试或联系技术支持</div>
                            </div>
                        </div>
                    `;
                }
                
                reject(error);
            }
        }
    });
}

/**
 * 添加城市标记
 * @param {string} cityName - 城市名称
 * @param {Array} coordinates - 坐标 [经度, 纬度]
 */
function addCityMarker(cityName, coordinates) {
    if (!mapInstance) {
        console.warn('⚠️ 地图实例不存在，无法添加城市标记');
        return;
    }

    // 验证和格式化坐标
    console.log(`🔍 城市 ${cityName} 原始坐标:`, coordinates);
    console.log(`🔍 城市坐标详细信息:`, {
        coordinates: coordinates,
        isArray: Array.isArray(coordinates),
        length: coordinates ? coordinates.length : 'undefined',
        lng: coordinates ? coordinates[0] : 'undefined',
        lat: coordinates ? coordinates[1] : 'undefined',
        lngType: coordinates ? typeof coordinates[0] : 'undefined',
        latType: coordinates ? typeof coordinates[1] : 'undefined',
        lngIsNaN: coordinates ? isNaN(coordinates[0]) : 'undefined',
        latIsNaN: coordinates ? isNaN(coordinates[1]) : 'undefined'
    });
    
    const validCoords = validateAndFormatCoordinates(coordinates, `城市标记-${cityName}`);
    if (!validCoords) {
        console.error(`❌ 无法为城市 ${cityName} 添加标记：坐标无效`, coordinates);
        return;
    }

    console.log(`✅ 为城市 ${cityName} 添加标记，验证后坐标:`, validCoords);

    // 创建城市标记的SVG，避免使用emoji
    const citySvg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
            <circle cx="16" cy="16" r="12" fill="#ff4757" stroke="#fff" stroke-width="2"/>
            <rect x="12" y="10" width="8" height="12" fill="white" rx="1"/>
            <rect x="13" y="11" width="2" height="2" fill="#ff4757"/>
            <rect x="15" y="11" width="2" height="2" fill="#ff4757"/>
            <rect x="13" y="13" width="2" height="2" fill="#ff4757"/>
            <rect x="15" y="13" width="2" height="2" fill="#ff4757"/>
            <rect x="13" y="15" width="2" height="2" fill="#ff4757"/>
            <rect x="15" y="15" width="2" height="2" fill="#ff4757"/>
        </svg>
    `;

    try {
        // 使用安全的坐标创建位置对象
        const position = createSafeLngLat(validCoords, `城市标记位置-${cityName}`);
        if (!position) {
            console.error(`❌ 无法为城市 ${cityName} 创建位置对象`);
            return;
        }
        
        console.log(`🗺️ 城市 ${cityName} 位置对象创建成功:`, position);
        
        const marker = new AMap.Marker({
            position: position,
            title: cityName,
            icon: new AMap.Icon({
                size: new AMap.Size(32, 32),
                image: 'data:image/svg+xml;base64,' + safeBase64Encode(citySvg)
            })
        });

        const infoWindow = new AMap.InfoWindow({
            content: `<div style="padding: 10px;"><h4>${cityName}</h4><p>城市中心</p></div>`
        });

        marker.on('click', () => {
            infoWindow.open(mapInstance, marker.getPosition());
        });

        mapInstance.add(marker);
        currentMarkers.push(marker);
        
        console.log(`✅ 城市标记 ${cityName} 添加成功`);
    } catch (error) {
        console.error(`❌ 添加城市标记 ${cityName} 失败:`, error);
    }
}

/**
 * 添加景点标记
 * @param {string} cityName - 城市名称
 * @param {Array} attractions - 景点列表
 */
function addAttractionMarkers(cityName, attractions) {
    if (!mapInstance || !window.attractionCoordinates[cityName]) {
        console.warn('⚠️ 地图实例或景点坐标数据不存在:', { mapInstance: !!mapInstance, cityName, hasCoordinates: !!window.attractionCoordinates[cityName] });
        return;
    }

    const cityAttractions = window.attractionCoordinates[cityName];
    console.log('📍 开始添加景点标记，城市:', cityName, '景点数量:', attractions.length);
    
    let validMarkersCount = 0;
    
    attractions.forEach((attraction, index) => {
        const coordinates = cityAttractions[attraction];
        if (coordinates) {
            console.log(`📍 处理景点标记: ${attraction}`, coordinates);
            
            // 使用新的坐标验证函数
            const validCoords = validateAndFormatCoordinates(coordinates, `景点标记-${attraction}`);
            if (!validCoords) {
                console.error(`❌ 无法为景点 ${attraction} 添加标记：坐标无效`, coordinates);
                return;
            }
            
            try {
                // 使用安全的坐标创建位置对象
                const position = createSafeLngLat(validCoords, `景点标记位置-${attraction}`);
                if (!position) {
                    console.error(`❌ 无法为景点 ${attraction} 创建位置对象`);
                    return;
                }
                
                console.log(`🗺️ 景点 ${attraction} 位置对象创建成功:`, position);
                
                // 创建景点标记的SVG，使用数字而不是emoji
                const attractionSvg = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
                        <circle cx="14" cy="14" r="10" fill="#2ed573" stroke="#fff" stroke-width="2"/>
                        <text x="14" y="18" text-anchor="middle" fill="white" font-size="10" font-weight="bold">${index + 1}</text>
                    </svg>
                `;

                const marker = new AMap.Marker({
                    position: position,
                    title: attraction,
                    icon: new AMap.Icon({
                        size: new AMap.Size(28, 28),
                        image: 'data:image/svg+xml;base64,' + safeBase64Encode(attractionSvg)
                    })
                });

                const infoWindow = new AMap.InfoWindow({
                    content: `<div style="padding: 10px;"><h4>${attraction}</h4><p>推荐景点 #${index + 1}</p></div>`
                });

                marker.on('click', () => {
                    infoWindow.open(mapInstance, marker.getPosition());
                });

                mapInstance.add(marker);
                currentMarkers.push(marker);
                validMarkersCount++;
                console.log(`✅ 景点标记添加成功: ${attraction}`);
            } catch (error) {
                console.error(`❌ 添加景点标记 ${attraction} 失败:`, error);
            }
        } else {
            console.warn(`⚠️ 未找到景点坐标: ${attraction}`);
        }
    });

    console.log(`📍 景点标记添加完成，成功添加 ${validMarkersCount}/${attractions.length} 个标记`);

    // 调整地图视野以包含所有标记
    if (currentMarkers.length > 1) {
        console.log('🗺️ 调整地图视野以包含所有标记，标记数量:', currentMarkers.length);
        
        // 验证所有标记是否有效
        const validMarkers = currentMarkers.filter(marker => {
            if (marker && typeof marker.getPosition === 'function') {
                const position = marker.getPosition();
                if (position && typeof position.getLng === 'function' && typeof position.getLat === 'function') {
                    const lng = position.getLng();
                    const lat = position.getLat();
                    const isValid = !isNaN(lng) && !isNaN(lat) && isFinite(lng) && isFinite(lat);
                    if (!isValid) {
                        console.warn('⚠️ 发现无效标记位置:', { lng, lat });
                    }
                    return isValid;
                }
            }
            return false;
        });
        
        console.log(`🗺️ 有效标记数量: ${validMarkers.length}/${currentMarkers.length}`);
        
        if (validMarkers.length > 1) {
            // 仅在局部范围内自适应视野，避免缩到世界级
            const positions = validMarkers.map(m => m.getPosition());
            const lngs = positions.map(p => p.getLng());
            const lats = positions.map(p => p.getLat());
            const lngSpan = Math.max(...lngs) - Math.min(...lngs);
            const latSpan = Math.max(...lats) - Math.min(...lats);
            const spanThreshold = 1.0; // ~100km
            
            if (lngSpan <= spanThreshold && latSpan <= spanThreshold) {
                try {
                    mapInstance.setFitView(validMarkers);
                    console.log('✅ 地图视野调整成功（局部范围）', { lngSpan, latSpan });
                } catch (error) {
                    console.error('❌ 调整地图视野失败:', error);
                }
            } else {
                console.warn('⚠️ 景点分布过广，跳过视野自适应', { lngSpan, latSpan });
            }
        } else {
            console.warn('⚠️ 有效标记数量不足，跳过地图视野调整');
        }
    }
}

/**
 * 清除所有标记
 */
function clearMarkers() {
    console.log('🧹 开始清除地图标记，当前标记数量:', currentMarkers.length);
    
    if (currentMarkers.length > 0 && mapInstance) {
        try {
            // 验证标记有效性并分别处理
            const validMarkers = [];
            const invalidMarkers = [];
            
            currentMarkers.forEach((marker, index) => {
                if (marker && typeof marker.getPosition === 'function') {
                    try {
                        const position = marker.getPosition();
                        if (position) {
                            validMarkers.push(marker);
                        } else {
                            invalidMarkers.push(marker);
                        }
                    } catch (error) {
                        console.warn(`⚠️ 标记 ${index} 位置获取失败:`, error);
                        invalidMarkers.push(marker);
                    }
                } else {
                    invalidMarkers.push(marker);
                }
            });
            
            console.log(`🧹 标记分类完成 - 有效: ${validMarkers.length}, 无效: ${invalidMarkers.length}`);
            
            // 清除有效标记
            if (validMarkers.length > 0) {
                mapInstance.remove(validMarkers);
                console.log(`✅ 成功清除 ${validMarkers.length} 个有效标记`);
            }
            
            // 记录无效标记
            if (invalidMarkers.length > 0) {
                console.warn(`⚠️ 发现 ${invalidMarkers.length} 个无效标记，已跳过清除`);
            }
            
        } catch (error) {
            console.error('❌ 清除标记时发生错误:', error);
        }
        
        currentMarkers = [];
    }
    
    // 清除路线
    if (drivingRoute) {
        try {
            drivingRoute.clear();
            drivingRoute = null;
            console.log('✅ 路线清除成功');
        } catch (error) {
            console.error('❌ 清除路线失败:', error);
            drivingRoute = null; // 强制重置
        }
    }

    // 清除图例
    const oldLegend = document.getElementById('mapLegend');
    if (oldLegend) {
        try {
            oldLegend.remove();
            console.log('✅ 图例清除成功');
        } catch (error) {
            console.error('❌ 清除图例失败:', error);
        }
    }
    
    console.log('🧹 地图标记清除完成');
}

/**
 * 创建按天分组的路线
 * @param {string} cityName - 城市名称
 * @param {Array} itinerary - 行程数据
 */
function createDailyRoutes(cityName, itinerary) {
    if (!mapInstance || !window.attractionCoordinates[cityName]) return;

    const cityAttractions = window.attractionCoordinates[cityName];
    const dayColors = ['#ff4757', '#3742fa', '#2ed573', '#ffa502', '#ff6348', '#5f27cd', '#00d2d3'];
    let allAttractions = [];

    // 为每天创建路线
    itinerary.forEach((dayPlan, dayIndex) => {
        const dayAttractions = [];
        
        // 收集当天的景点
        dayPlan.activities.forEach((activity, activityIndex) => {
            if (activity.type === 'attraction' && cityAttractions[activity.name]) {
                const coordinates = cityAttractions[activity.name];
                dayAttractions.push({
                    name: activity.name,
                    coordinates: coordinates,
                    dayIndex: dayIndex,
                    activityIndex: activityIndex
                });
                allAttractions.push({
                    name: activity.name,
                    coordinates: coordinates,
                    dayIndex: dayIndex,
                    activityIndex: activityIndex
                });
            }
        });

        // 为当天的景点创建标记
        if (dayAttractions.length > 0) {
            createDayMarkers(dayAttractions, dayIndex, dayColors[dayIndex % dayColors.length]);
            
            // 如果当天有多个景点，创建连线
            if (dayAttractions.length > 1) {
                createDayPolyline(dayAttractions, dayColors[dayIndex % dayColors.length]);
            }
        }
    });

    // 创建图例
    if (allAttractions.length > 0) {
        createMapLegend(itinerary, dayColors);
    }

    // 调整地图视野以包含所有景点
    if (allAttractions.length > 0) {
        const bounds = new AMap.Bounds();
        let validBoundsCount = 0;
        // 统计范围跨度以避免缩到世界级
        let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
        
        allAttractions.forEach((attraction, index) => {
            console.log(`🗺️ 处理地图边界坐标 ${index + 1}: ${attraction.name}`, attraction.coordinates);
            
            // 验证坐标格式
            let coordinates;
            if (Array.isArray(attraction.coordinates) && attraction.coordinates.length === 2) {
                coordinates = attraction.coordinates;
            } else if (attraction.coordinates && attraction.coordinates.lng !== undefined && attraction.coordinates.lat !== undefined) {
                coordinates = [attraction.coordinates.lng, attraction.coordinates.lat];
            } else {
                console.warn(`⚠️ 景点 ${attraction.name} 边界坐标格式无效:`, attraction.coordinates);
                return;
            }
            
            // 使用坐标验证函数确保坐标有效
            const validCoords = validateAndFormatCoordinates(coordinates, `地图边界-${attraction.name}`);
            if (!validCoords) {
                console.warn(`⚠️ 跳过无效边界坐标的景点: ${attraction.name}`, coordinates);
                return;
            }
            
            try {
                // 使用安全的坐标创建位置对象
                const position = createSafeLngLat(validCoords, `地图边界位置-${attraction.name}`);
                if (position) {
                    bounds.extend(position);
                    const lng = position.getLng();
                    const lat = position.getLat();
                    minLng = Math.min(minLng, lng);
                    maxLng = Math.max(maxLng, lng);
                    minLat = Math.min(minLat, lat);
                    maxLat = Math.max(maxLat, lat);
                    validBoundsCount++;
                    console.log(`✅ 景点 ${attraction.name} 边界坐标添加成功`);
                } else {
                    console.warn(`⚠️ 无法为景点 ${attraction.name} 创建边界位置对象`);
                }
            } catch (error) {
                console.error(`❌ 处理景点 ${attraction.name} 边界坐标失败:`, error);
            }
        });
        
        console.log(`🗺️ 地图边界设置完成，有效坐标数量: ${validBoundsCount}/${allAttractions.length}`);
        
        // 只有在有有效坐标且范围在局部阈值内时才设置地图边界
        const lngSpan = (maxLng - minLng);
        const latSpan = (maxLat - minLat);
        const spanThreshold = 1.0; // ~100km
        
        if (validBoundsCount > 0 && lngSpan <= spanThreshold && latSpan <= spanThreshold) {
            try {
                mapInstance.setBounds(bounds, false, [50, 50, 50, 50]);
                console.log('✅ 地图视野调整成功（局部范围）', { lngSpan, latSpan });
            } catch (error) {
                console.error('❌ 设置地图边界失败:', error);
            }
        } else {
            console.warn('⚠️ 景点分布过广或无有效坐标，跳过视野自适应', { validBoundsCount, lngSpan, latSpan });
        }
    }
}

/**
 * 为某一天创建景点标记
 * @param {Array} dayAttractions - 当天的景点列表
 * @param {number} dayIndex - 天数索引
 * @param {string} color - 标记颜色
 */
function createDayMarkers(dayAttractions, dayIndex, color) {
    console.log(`🗺️ 创建第${dayIndex + 1}天的景点标记，景点数量:`, dayAttractions.length);
    
    let validMarkersCount = 0;
    
    dayAttractions.forEach((attraction, index) => {
        console.log(`📍 处理第${dayIndex + 1}天景点标记: ${attraction.name}`, attraction.coordinates);
        
        // 使用统一的坐标验证函数
        let coordinates;
        if (Array.isArray(attraction.coordinates) && attraction.coordinates.length === 2) {
            coordinates = attraction.coordinates;
        } else if (attraction.coordinates && attraction.coordinates.lng !== undefined && attraction.coordinates.lat !== undefined) {
            coordinates = [attraction.coordinates.lng, attraction.coordinates.lat];
        } else {
            console.error(`❌ 第${dayIndex + 1}天景点 ${attraction.name} 坐标格式无效:`, attraction.coordinates);
            return;
        }
        
        // 验证和格式化坐标
        const validCoords = validateAndFormatCoordinates(coordinates, `第${dayIndex + 1}天景点-${attraction.name}`);
        if (!validCoords) {
            console.error(`❌ 第${dayIndex + 1}天景点 ${attraction.name} 坐标验证失败，跳过标记创建`);
            return;
        }
        
        try {
            // 使用安全的坐标创建位置对象
            const position = createSafeLngLat(validCoords, `第${dayIndex + 1}天景点标记-${attraction.name}`);
            if (!position) {
                console.error(`❌ 无法为第${dayIndex + 1}天景点 ${attraction.name} 创建位置对象`);
                return;
            }
            
            // 创建带序号的标记SVG
            const markerSvg = `
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
                    <circle cx="16" cy="16" r="12" fill="${color}" stroke="#fff" stroke-width="2"/>
                    <text x="16" y="20" text-anchor="middle" fill="white" font-size="12" font-weight="bold">${index + 1}</text>
                </svg>
            `;

            const marker = new AMap.Marker({
                position: position,
                title: attraction.name,
                icon: new AMap.Icon({
                    size: new AMap.Size(32, 32),
                    image: 'data:image/svg+xml;base64,' + safeBase64Encode(markerSvg)
                })
            });

            const infoWindow = new AMap.InfoWindow({
                content: `
                    <div style="padding: 10px; min-width: 200px;">
                        <h4 style="margin: 0 0 8px 0; color: ${color};">第${dayIndex + 1}天 - 景点${index + 1}</h4>
                        <p style="margin: 0; font-weight: bold;">${attraction.name}</p>
                        <p style="margin: 5px 0 0 0; color: #666; font-size: 12px;">点击查看详细信息</p>
                    </div>
                `
            });

            marker.on('click', () => {
                infoWindow.open(mapInstance, marker.getPosition());
            });

            mapInstance.add(marker);
            currentMarkers.push(marker);
            validMarkersCount++;
            console.log(`✅ 第${dayIndex + 1}天景点标记创建成功: ${attraction.name}`);
            
        } catch (error) {
            console.error(`❌ 创建第${dayIndex + 1}天景点标记 ${attraction.name} 失败:`, error);
        }
    });
    
    console.log(`📍 第${dayIndex + 1}天景点标记创建完成，成功创建 ${validMarkersCount}/${dayAttractions.length} 个标记`);
}

/**
 * 为某一天创建连线
 * @param {Array} dayAttractions - 当天的景点列表
 * @param {string} color - 连线颜色
 */
function createDayPolyline(dayAttractions, color) {
    console.log('🛣️ 创建路径连线，景点数量:', dayAttractions.length);
    
    // 使用坐标验证函数确保坐标格式正确，转换为AMap.LngLat对象数组
    const path = dayAttractions.map((attraction, index) => {
        console.log(`🔗 处理连线坐标 ${index + 1}: ${attraction.name}`, attraction.coordinates);
        
        let coordinates;
        if (Array.isArray(attraction.coordinates) && attraction.coordinates.length === 2) {
            coordinates = attraction.coordinates;
        } else if (attraction.coordinates && attraction.coordinates.lng !== undefined && attraction.coordinates.lat !== undefined) {
            coordinates = [attraction.coordinates.lng, attraction.coordinates.lat];
        } else {
            console.error(`❌ 景点 ${attraction.name} 连线坐标格式无效:`, attraction.coordinates);
            return null;
        }
        
        // 验证坐标有效性
        const validCoords = validateAndFormatCoordinates(coordinates, `连线坐标-${attraction.name}`);
        if (!validCoords) {
            console.error(`❌ 景点 ${attraction.name} 连线坐标验证失败，跳过此点`);
            return null;
        }
        
        try {
            // 使用安全的坐标创建位置对象
            const position = createSafeLngLat(validCoords, `连线位置-${attraction.name}`);
            if (!position) {
                console.error(`❌ 无法为景点 ${attraction.name} 创建连线位置对象`);
                return null;
            }
            
            console.log(`✅ 景点 ${attraction.name} 连线坐标验证成功`);
            return position;
            
        } catch (error) {
            console.error(`❌ 创建景点 ${attraction.name} 连线位置失败:`, error);
            return null;
        }
    }).filter(coord => coord !== null); // 过滤掉无效坐标
    
    console.log(`🛣️ 有效连线坐标数量: ${path.length}/${dayAttractions.length}`);
    
    if (path.length < 2) {
        console.warn('⚠️ 有效路径坐标不足，无法创建连线');
        return;
    }
    
    try {
        const polyline = new AMap.Polyline({
            path: path,
            strokeColor: color,
            strokeWeight: 4,
            strokeOpacity: 0.8,
            strokeStyle: 'solid'
        });

        mapInstance.add(polyline);
        currentMarkers.push(polyline); // 将连线也加入到标记数组中，方便清除
        console.log('✅ 路径连线创建成功');
        
    } catch (error) {
        console.error('❌ 创建路径连线失败:', error);
    }
}

/**
 * 创建地图图例
 * @param {Array} itinerary - 行程数据
 * @param {Array} dayColors - 每天的颜色数组
 */
function createMapLegend(itinerary, dayColors) {
    const legendContainer = document.createElement('div');
    legendContainer.id = 'mapLegend';
    legendContainer.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        background: rgba(255, 255, 255, 0.95);
        padding: 15px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        font-size: 12px;
        z-index: 1000;
        max-width: 200px;
    `;

    let legendHTML = '<h4 style="margin: 0 0 10px 0; color: #333;">游览路线图例</h4>';
    
    itinerary.forEach((dayPlan, index) => {
        const color = dayColors[index % dayColors.length];
        const attractionCount = dayPlan.activities.filter(activity => activity.type === 'attraction').length;
        
        if (attractionCount > 0) {
            legendHTML += `
                <div style="display: flex; align-items: center; margin-bottom: 8px;">
                    <div style="width: 16px; height: 16px; background: ${color}; border-radius: 50%; margin-right: 8px; border: 2px solid #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>
                    <span style="color: #333;">第${index + 1}天 (${attractionCount}个景点)</span>
                </div>
            `;
        }
    });

    legendContainer.innerHTML = legendHTML;

    // 移除旧的图例
    const oldLegend = document.getElementById('mapLegend');
    if (oldLegend) {
        oldLegend.remove();
    }

    // 添加新图例到地图容器
    const mapContainer = document.getElementById('map');
    mapContainer.style.position = 'relative';
    mapContainer.appendChild(legendContainer);
}

/**
 * 规划景点间路线
 * @param {string} cityName - 城市名称
 * @param {Array} attractions - 景点列表
 */
function planRoute(cityName, attractions) {
    if (!mapInstance || !window.attractionCoordinates[cityName] || attractions.length < 2) return;

    const cityAttractions = window.attractionCoordinates[cityName];
    const waypoints = [];
    
    // 收集有效的景点坐标
    attractions.forEach((attraction, index) => {
        const coordinates = cityAttractions[attraction];
        console.log(`🔍 处理路线规划坐标 ${index + 1}: ${attraction}`, coordinates);
        
        if (coordinates) {
            // 使用安全的坐标验证和创建函数
            const safeLngLat = createSafeLngLat(coordinates, `路线规划-${attraction}`);
            if (safeLngLat) {
                waypoints.push(safeLngLat);
                console.log(`✅ 路线点添加成功: ${attraction}`);
            } else {
                console.warn(`⚠️ 跳过无效坐标的景点: ${attraction}`, coordinates);
            }
        } else {
            console.warn(`⚠️ 景点坐标不存在: ${attraction}`);
        }
    });

    console.log(`🗺️ 路线规划准备，有效路径点数量: ${waypoints.length}/${attractions.length}`);
    
    if (waypoints.length < 2) {
        console.warn('⚠️ 有效路径点不足，无法进行路线规划');
        return;
    }

    // 创建驾车路线规划实例
    drivingRoute = new AMap.Driving({
        map: mapInstance,
        showTraffic: false,
        hideMarkers: true, // 隐藏默认标记，使用自定义标记
        autoFitView: false, // 不自动调整视野，我们手动控制
        policy: AMap.DrivingPolicy.LEAST_TIME // 最短时间策略
    });

    // 规划路线：从第一个景点到最后一个景点，中间经过其他景点
    const start = waypoints[0];
    const end = waypoints[waypoints.length - 1];
    const viaPoints = waypoints.slice(1, -1); // 中间的途经点

    console.log('🗺️ 开始路线规划:', {
        start: start ? `${start.getLng()}, ${start.getLat()}` : 'null',
        end: end ? `${end.getLng()}, ${end.getLat()}` : 'null',
        viaPointsCount: viaPoints.length,
        totalWaypoints: waypoints.length
    });

    try {
        drivingRoute.search(start, end, {
            waypoints: viaPoints
        }, (status, result) => {
            console.log('🗺️ 路线规划回调状态:', status);
            if (status === 'complete') {
                console.log('✅ 路线规划成功');
                displayRouteInfo(result);
            } else {
                console.warn('⚠️ 路线规划失败:', status, result);
            }
        });
    } catch (error) {
        console.error('❌ 路线规划过程中发生错误:', error);
    }
}

/**
 * 显示路线信息
 * @param {Object} result - 路线规划结果
 */
function displayRouteInfo(result) {
    if (!result.routes || result.routes.length === 0) return;

    const route = result.routes[0];
    const distance = (route.distance / 1000).toFixed(1); // 转换为公里
    const duration = Math.round(route.time / 60); // 转换为分钟

    // 在地图容器下方添加路线信息
    const mapContainer = document.getElementById('map');
    let routeInfo = document.getElementById('route-info');
    
    if (!routeInfo) {
        routeInfo = document.createElement('div');
        routeInfo.id = 'route-info';
        routeInfo.style.cssText = `
            margin-top: 10px;
            padding: 15px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 8px;
            font-size: 14px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        `;
        mapContainer.parentNode.insertBefore(routeInfo, mapContainer.nextSibling);
    }

    routeInfo.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
                <strong>🚗 推荐游览路线</strong>
            </div>
            <div style="text-align: right;">
                <div>📏 总距离: <strong>${distance} 公里</strong></div>
                <div>⏱️ 预计时间: <strong>${duration} 分钟</strong></div>
            </div>
        </div>
        <div style="margin-top: 8px; font-size: 12px; opacity: 0.9;">
            💡 路线已优化，建议按标记顺序游览以节省时间
        </div>
    `;
}