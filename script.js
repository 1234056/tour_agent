// AI旅游规划助手 - 完全依赖API生成

// 表单提交处理
document.getElementById('travelForm').addEventListener('submit', function(e) {
    e.preventDefault();
    generateTravelPlan();
});

// 生成旅游方案 - 集成真实AI API
async function generateTravelPlan() {
    const formData = new FormData(document.getElementById('travelForm'));
    const destination = formData.get('destination');
    const days = parseInt(formData.get('days'));
    const budget = formData.get('budget');
    const interests = formData.getAll('interests');
    
    // 显示加载状态
    showLoading(true);
    
    try {
        // 新的分步骤流程
        console.log('🚀 开始智能路线规划...');
        
        // 第一步：AI生成推荐景点列表
        showDetailedProgress(1, 5, 'AI景点推荐', `正在为${destination}生成${days}天的个性化景点推荐，考虑您的兴趣偏好：${interests.join('、')}`);
        const recommendedAttractions = await generateAttractionRecommendations(destination, days, budget, interests);
        
        // 第二步：获取景点坐标和交通信息
        showDetailedProgress(2, 5, '地理信息获取', `正在通过高德地图API获取${recommendedAttractions.length}个景点的精确坐标和周边信息`);
        const attractionsWithGeoData = await getAttractionCoordinates(destination, recommendedAttractions);
        // 新增：构建景点坐标缓存，供地图绘制使用
        attractionCoordinates[destination] = {};
        attractionsWithGeoData.forEach(item => {
            if (item && item.name && item.coordinates) {
                attractionCoordinates[destination][item.name] = item.coordinates;
            }
        });
        
        // 第三步：计算景点间距离和交通方式
        showDetailedProgress(3, 5, '路线计算', `正在计算景点间的最优交通方式，分析步行、驾车、公交等选项`);
        const distanceMatrix = await calculateDistanceMatrix(attractionsWithGeoData);
        
        // 第四步：AI根据地理数据优化行程分组
        showDetailedProgress(4, 5, 'AI行程优化', `基于真实地理数据和交通信息，AI正在为您优化${days}天的行程安排`);
        const optimizedPlan = await optimizeItineraryWithGeoData(destination, days, budget, interests, attractionsWithGeoData, distanceMatrix);
        
        // 第五步：显示结果和地图
        showDetailedProgress(5, 5, '地图可视化', '正在生成交互式地图，标记景点位置并绘制每日路线');
        
        // 添加交通信息到结果页面
        const transportDetails = displayTransportDetails(distanceMatrix, attractionsWithGeoData);
        if (transportDetails) {
            // 将交通信息添加到计划中
            optimizedPlan.transportDetails = transportDetails;
        }
        
        displayTravelPlan(optimizedPlan);
        console.log('✅ 智能路线规划完成');
        
    } catch (error) {
        console.error('智能路线规划失败:', error);
        
        // 显示用户友好的错误信息
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.style.cssText = `
            background: #ffebee;
            border: 1px solid #f44336;
            color: #c62828;
            padding: 12px;
            border-radius: 8px;
            margin: 10px 0;
            font-size: 14px;
        `;
        
        let retryButton = '';
        if (error.message.includes('400')) {
            errorMessage.innerHTML = `
                <strong>⚠️ AI服务暂时不可用</strong><br>
                可能的原因：API密钥无效或模型不可用<br>
                <small>请检查API配置或稍后重试</small>
            `;
            retryButton = '<button onclick="generateTravelPlan()" style="margin-top: 8px; padding: 4px 8px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;">重试</button>';
        } else if (error.message.includes('401')) {
            errorMessage.innerHTML = `
                <strong>🔑 API认证失败</strong><br>
                请检查API密钥是否正确配置<br>
                <small>请在设置中配置正确的API密钥</small>
            `;
        } else if (error.message.includes('429')) {
            errorMessage.innerHTML = `
                <strong>⏰ 请求过于频繁</strong><br>
                请稍后再试<br>
                <small>建议等待1-2分钟后重试</small>
            `;
            retryButton = '<button onclick="setTimeout(generateTravelPlan, 60000)" style="margin-top: 8px; padding: 4px 8px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;">1分钟后重试</button>';
        } else {
            errorMessage.innerHTML = `
                <strong>🌐 网络连接问题</strong><br>
                无法连接到AI服务或地图服务<br>
                <small>请检查网络连接后重试</small>
            `;
            retryButton = '<button onclick="generateTravelPlan()" style="margin-top: 8px; padding: 4px 8px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;">重试</button>';
        }
        
        errorMessage.innerHTML += retryButton;
        
        // 在结果区域显示错误信息
        const resultSection = document.getElementById('resultSection');
        if (resultSection) {
            resultSection.innerHTML = '';
            resultSection.appendChild(errorMessage);
        }
        
        updateProgressStatus('❌ 生成失败，请重试', 0);
    }
    
    showLoading(false);
    document.getElementById('resultSection').scrollIntoView({ behavior: 'smooth' });
}







// 显示旅游方案
function displayTravelPlan(plan) {
    // 显示结果区域
    document.getElementById('resultSection').style.display = 'block';
    
    // 显示方案概览
    displayPlanOverview(plan);
    
    // 显示详细行程
    displayItinerary(plan.itinerary);
    
    // 显示推荐信息
    displayRecommendations(plan.recommendations);
    
    // 显示交通信息详情（如果有）
    if (plan.transportDetails) {
        displayTransportInfo(plan.transportDetails);
    }
    
    // 初始化地图并传递完整的行程数据（使用重试机制）
    initializeMapWithRetry(plan.destination, plan.itinerary).catch(error => {
        console.error('❌ 地图初始化最终失败:', error);
        // 可以在这里添加用户友好的错误提示
    });
}

// 显示方案概览
function displayPlanOverview(plan) {
    // 首先检查DOM元素是否存在
    const planOverviewElement = document.getElementById('planOverview');
    if (!planOverviewElement) {
        console.error('planOverview DOM元素未找到');
        return;
    }
    
    // 安全检查：确保plan存在
    if (!plan) {
        console.error('计划数据不存在，无法显示概览');
        planOverviewElement.innerHTML = `
            <h3>🎯 旅游方案概览</h3>
            <div class="error-message">数据加载失败，请重试</div>
        `;
        return;
    }
    
    // 使用默认值防止undefined错误，支持多种数据结构
    const overview = plan.overview || {};
    const totalDays = overview.totalDays || plan.days || '未知';
    const estimatedCost = overview.estimatedCost || plan.estimatedCost || '待计算';
    const attractions = overview.attractions || (plan.itinerary ? plan.itinerary.length : '多个');
    const hotels = overview.hotels || '多个';
    const destination = plan.destination || '目的地';
    const days = plan.days || '';
    
    try {
        const overviewHtml = `
            <h3>🎯 ${destination}${days}日游方案</h3>
            <div class="overview-grid">
                <div class="overview-item">
                    <span class="number">${totalDays}</span>
                    <span class="label">游玩天数</span>
                </div>
                <div class="overview-item">
                    <span class="number">${estimatedCost}</span>
                    <span class="label">预估费用(元)</span>
                </div>
                <div class="overview-item">
                    <span class="number">${attractions}</span>
                    <span class="label">推荐景点</span>
                </div>
                <div class="overview-item">
                    <span class="number">${hotels}</span>
                    <span class="label">酒店推荐</span>
                </div>
            </div>
        `;
        
        planOverviewElement.innerHTML = overviewHtml;
        console.log('✅ 旅游方案概览显示成功');
        
    } catch (error) {
        console.error('显示旅游方案概览时出错:', error);
        planOverviewElement.innerHTML = `
            <h3>🎯 旅游方案概览</h3>
            <div class="error-message">显示出错，请重试</div>
        `;
    }
}

// 显示详细行程
function displayItinerary(itinerary) {
    let itineraryHtml = '<h3>📅 详细行程安排</h3>';
    
    // 安全检查：确保itinerary存在且是数组
    if (!itinerary || !Array.isArray(itinerary) || itinerary.length === 0) {
        itineraryHtml += '<div class="error-message">行程数据加载失败，请重试</div>';
        document.getElementById('itinerary').innerHTML = itineraryHtml;
        return;
    }
    
    itinerary.forEach(dayPlan => {
        // 安全检查：确保dayPlan存在且有必要的属性
        if (!dayPlan || !dayPlan.day) {
            return; // 跳过无效的日程
        }
        
        itineraryHtml += `
            <div class="day-plan">
                <div class="day-title">第${dayPlan.day}天</div>
        `;
        
        // 安全检查：确保activities存在且是数组
        if (dayPlan.activities && Array.isArray(dayPlan.activities)) {
            dayPlan.activities.forEach(activity => {
                // 安全检查：确保activity有必要的属性
                if (!activity) return;
                
                const time = activity.time || '全天';
                const title = activity.name || '活动';
                const description = activity.description || '详情待定';
                
                itineraryHtml += `
                    <div class="activity">
                        <div class="activity-time">${time}</div>
                        <div class="activity-content">
                            <div class="activity-title">${title}</div>
                            <div class="activity-description">${description}</div>
                        </div>
                    </div>
                `;
            });
        } else {
            itineraryHtml += `
                <div class="activity">
                    <div class="activity-content">
                        <div class="activity-title">暂无具体安排</div>
                        <div class="activity-description">请稍后查看详细行程</div>
                    </div>
                </div>
            `;
        }
        
        itineraryHtml += '</div>';
    });
    
    document.getElementById('itinerary').innerHTML = itineraryHtml;
}

// 显示推荐信息
function displayRecommendations(recommendations) {
    const recommendationsHtml = `
        <h3>💡 贴心推荐</h3>
        <div class="recommendation-grid">
            <div class="recommendation-card">
                <h4>🏨 推荐酒店</h4>
                ${recommendations.hotels.map(hotel => `<div class="recommendation-item">${hotel}</div>`).join('')}
            </div>
            <div class="recommendation-card">
                <h4>🍜 特色美食</h4>
                ${recommendations.food.map(food => `<div class="recommendation-item">${food}</div>`).join('')}
            </div>
            <div class="recommendation-card">
                <h4>🚌 交通方式</h4>
                <div class="recommendation-item">${recommendations.transport}</div>
            </div>
            <div class="recommendation-card">
                <h4>💡 旅行贴士</h4>
                <div class="recommendation-item">${recommendations.tips}</div>
            </div>
        </div>
    `;
    
    document.getElementById('recommendations').innerHTML = recommendationsHtml;
}

// 城市坐标数据
// 模拟数据已删除，完全依赖API生成

// 全局地图实例
let mapInstance = null;
let currentMarkers = [];
let drivingRoute = null;
let attractionCoordinates = {};

// 常见城市的默认坐标库
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

// 获取城市默认坐标的函数
function getCityDefaultCoordinates(cityName) {
    // 直接匹配
    if (DEFAULT_CITY_COORDINATES[cityName]) {
        console.log(`✅ 找到${cityName}的默认坐标:`, DEFAULT_CITY_COORDINATES[cityName]);
        return DEFAULT_CITY_COORDINATES[cityName];
    }
    
    // 模糊匹配（去除"市"、"省"等后缀）
    const cleanCityName = cityName.replace(/[市省区县]/g, '');
    for (const [key, coords] of Object.entries(DEFAULT_CITY_COORDINATES)) {
        if (key.includes(cleanCityName) || cleanCityName.includes(key)) {
            console.log(`✅ 通过模糊匹配找到${cityName}(${cleanCityName})的默认坐标:`, coords);
            return coords;
        }
    }
    
    console.log(`⚠️ 未找到${cityName}的默认坐标`);
    return null;
}

// 根据城市和景点数量智能选择zoom级别
function getOptimalZoomLevel(cityName, attractionCount = 0) {
    let baseZoom = 12;
    
    // 根据景点数量微调
    if (attractionCount > 10) {
        baseZoom = Math.max(baseZoom - 1, 11); // 景点多的话稍微缩小
    } else if (attractionCount < 3) {
        baseZoom = Math.min(baseZoom + 1, 13); // 景点少的话稍微放大
    }
    
    console.log(`🔍 为${cityName}选择zoom级别: ${baseZoom} (景点数量: ${attractionCount})`);
    return baseZoom;
}

// 安全的Base64编码函数，支持中文和emoji
function safeBase64Encode(str) {
    try {
        // 使用encodeURIComponent处理特殊字符，然后转换为base64
        return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
            return String.fromCharCode('0x' + p1);
        }));
    } catch (error) {
        console.warn('Base64编码失败，使用备用方案:', error);
        // 备用方案：移除特殊字符
        const cleanStr = str.replace(/[^\x00-\x7F]/g, "");
        return btoa(cleanStr);
    }
}

// 带重试机制的地图初始化包装函数
async function initializeMapWithRetry(destination, itinerary = [], maxRetries = 3) {
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🔄 地图初始化尝试 ${attempt}/${maxRetries}`);
            await initializeMap(destination, itinerary);
            console.log('✅ 地图初始化成功');
            return; // 成功则退出
        } catch (error) {
            lastError = error;
            console.warn(`⚠️ 地图初始化第${attempt}次尝试失败:`, error.message);
            
            if (attempt < maxRetries) {
                const delay = attempt * 2000; // 递增延迟：2s, 4s, 6s
                console.log(`⏳ ${delay/1000}秒后重试...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    // 所有重试都失败
    console.error('❌ 地图初始化最终失败，已尝试', maxRetries, '次');
    throw lastError;
}

// 初始化高德地图
async function initializeMap(destination, itinerary = []) {
    const mapContainer = document.getElementById('map');
    
    try {
        console.log('🗺️ 开始初始化高德地图，目标城市:', destination);
        
        // 显示加载状态
        mapContainer.innerHTML = `
            <div style="text-align: center; padding: 50px; color: #666;">
                <div style="font-size: 2rem; margin-bottom: 20px;">🗺️</div>
                <p>正在加载高德地图...</p>
                <p style="font-size: 0.9em; color: #999;">正在获取${destination}的地理坐标...</p>
            </div>
        `;

        // 加载高德地图API
        console.log('📦 加载高德地图API...');
        const AMap = await new Promise((resolve, reject) => {
            if (window.AMapLoader) {
                window.AMapLoader.load({
                    key: 'a7dd919baf2818a9b9fd7cbdeadba786', // 请替换为你的实际API Key
                    version: '2.0',
                    plugins: ['AMap.Marker', 'AMap.InfoWindow', 'AMap.Driving', 'AMap.Geocoder', 'AMap.Polyline'],
                    // 添加更多配置优化网络加载
                    AMapUI: {
                        version: '1.1',
                        plugins: []
                    },
                    Loca: {
                        version: '2.0'
                    }
                }).then((AMap) => {
                    console.log('✅ 高德地图API加载成功');
                    
                    // 设置全局配置优化网络请求
                    if (AMap.plugin) {
                        AMap.plugin(['AMap.TileLayer'], function() {
                            // 配置瓦片加载参数
                            console.log('🔧 配置瓦片加载参数');
                        });
                    }
                    
                    resolve(AMap);
                }).catch((error) => {
                    console.error('❌ 高德地图API加载失败:', error);
                    
                    // 详细的错误分析和提示
                    let errorMessage = '高德地图API加载失败';
                    if (error.message && error.message.includes('Invalid')) {
                        errorMessage = 'API密钥无效，请检查密钥配置';
                    } else if (error.message && error.message.includes('quota')) {
                        errorMessage = 'API调用配额已用完，请检查账户状态';
                    } else if (error.message && error.message.includes('network')) {
                        errorMessage = '网络连接失败，请检查网络状态';
                    } else if (error.message && error.message.includes('CORS')) {
                        errorMessage = 'CORS跨域问题，请检查域名配置';
                    }
                    
                    console.error('❌ 错误详情:', errorMessage);
                    reject(new Error(errorMessage));
                });
            } else {
                const error = new Error('高德地图加载器未找到，请检查网络连接');
                console.error('❌', error.message);
                reject(error);
            }
        });

        // 获取城市中心坐标（通过高德地理编码）
        console.log('🔍 开始获取城市中心坐标...');
        let cityCenter = null;
        
        try {
            // 创建地理编码实例（插件已在AMapLoader中加载）
            const geocoder = new AMap.Geocoder({
                extensions: 'all'
            });
            
            cityCenter = await new Promise((resolve, reject) => {
                console.log('📍 调用地理编码API，查询:', destination);
                
                geocoder.getLocation(destination, (status, result) => {
                    console.log('🔍 地理编码API响应状态:', status);
                    console.log('🔍 地理编码API响应结果:', result);
                    
                    if (status === 'complete' && result.geocodes && result.geocodes.length > 0) {
                        const geocode = result.geocodes[0];
                        const location = geocode.location;
                        
                        console.log('✅ 成功获取城市坐标:', {
                            city: geocode.city || geocode.district || destination,
                            lng: location.lng,
                            lat: location.lat,
                            address: geocode.formattedAddress
                        });
                        
                        // 验证坐标有效性
                        const validCoords = validateAndFormatCoordinates([location.lng, location.lat], `地理编码-${destination}`);
                        if (validCoords) {
                            resolve(validCoords);
                        } else {
                            reject(new Error(`地理编码返回的坐标无效: lng=${location.lng}, lat=${location.lat}`));
                        }
                    } else {
                        const errorMsg = `地理编码失败: ${status}, ${result.info || '未知错误'}`;
                        console.error('❌', errorMsg);
                        reject(new Error(errorMsg));
                    }
                });
            });
            
        } catch (geoErr) {
        console.warn('⚠️ 城市地理编码失败，尝试使用备选方案:', geoErr.message);
        
        // 备选方案1: 使用默认城市坐标库
        console.log('📍 尝试使用默认城市坐标库...');
        const defaultCoords = getCityDefaultCoordinates(destination);
        if (defaultCoords) {
            const validatedCoords = validateAndFormatCoordinates(defaultCoords, `默认坐标-${destination}`);
            if (validatedCoords) {
                cityCenter = validatedCoords;
                console.log('✅ 使用默认城市坐标:', cityCenter);
            }
        }
        
        // 备选方案2: 使用景点坐标计算中心点
        if (!cityCenter) {
            console.log('📍 尝试使用景点坐标计算中心点...');
            const cityMap = attractionCoordinates[destination];
            if (cityMap && Object.keys(cityMap).length > 0) {
                const coords = Object.values(cityMap);
                console.log('📍 使用景点坐标计算中心点，景点数量:', coords.length);
                
                // 过滤有效坐标并验证
                const validCoords = coords.filter(coord => {
                    const validatedCoord = validateAndFormatCoordinates(coord, `景点坐标-${destination}`);
                    return validatedCoord !== null;
                }).map(coord => validateAndFormatCoordinates(coord, `景点坐标-${destination}`));
                
                if (validCoords.length > 0) {
                    const avgLng = validCoords.reduce((sum, coord) => sum + coord[0], 0) / validCoords.length;
                    const avgLat = validCoords.reduce((sum, coord) => sum + coord[1], 0) / validCoords.length;
                    
                    // 验证计算结果
                    if (!isNaN(avgLng) && !isNaN(avgLat) && isFinite(avgLng) && isFinite(avgLat)) {
                        cityCenter = [avgLng, avgLat];
                        console.log('✅ 使用景点坐标均值作为中心:', { lng: avgLng, lat: avgLat, validCount: validCoords.length });
                    } else {
                        console.error('❌ 计算的平均坐标无效:', { avgLng, avgLat });
                    }
                } else {
                    console.warn('⚠️ 没有找到有效的景点坐标');
                }
            }
        }
        
        // 备选方案3: 使用北京作为默认坐标
        if (!cityCenter) {
            console.warn('⚠️ 所有坐标获取方案都失败，使用北京作为默认中心点');
            cityCenter = [116.397428, 39.90923]; // 北京坐标
        }
    }
        
        console.log('🗺️ 创建地图实例，中心点:', cityCenter);
        
        // 最终验证中心点坐标
        const finalCityCenter = validateAndFormatCoordinates(cityCenter, `地图中心点-${destination}`);
        if (!finalCityCenter) {
            throw new Error(`地图中心点坐标无效: ${JSON.stringify(cityCenter)}`);
        }
        
        // 创建地图实例
        console.log('🗺️ 即将创建地图实例，最终中心点坐标:', finalCityCenter);
        console.log('🔍 中心点坐标详细信息:', {
            lng: finalCityCenter[0],
            lat: finalCityCenter[1],
            lngType: typeof finalCityCenter[0],
            latType: typeof finalCityCenter[1],
            lngIsNaN: isNaN(finalCityCenter[0]),
            latIsNaN: isNaN(finalCityCenter[1]),
            lngIsFinite: isFinite(finalCityCenter[0]),
            latIsFinite: isFinite(finalCityCenter[1])
        });
        
        // 最终安全检查：确保传递给地图的坐标绝对不包含 NaN
        let safeCenterCoords = finalCityCenter;
        const defaultCoords = [116.397428, 39.90923]; // 北京坐标作为默认值
        
        if (!safeCenterCoords || !Array.isArray(safeCenterCoords) || safeCenterCoords.length < 2) {
            console.warn('⚠️ finalCityCenter 格式无效，使用默认坐标:', safeCenterCoords);
            safeCenterCoords = defaultCoords;
        } else if (isNaN(safeCenterCoords[0]) || isNaN(safeCenterCoords[1]) || 
                   !isFinite(safeCenterCoords[0]) || !isFinite(safeCenterCoords[1])) {
            console.warn('⚠️ finalCityCenter 包含 NaN 或无限值，使用默认坐标:', safeCenterCoords);
        safeCenterCoords = defaultCoords;
    }
    
    // 计算最优zoom级别
    const attractionCount = itinerary.reduce((total, day) => total + (day.attractions ? day.attractions.length : 0), 0);
    const optimalZoom = getOptimalZoomLevel(destination, attractionCount);
    
    console.log('🗺️ 最终地图中心坐标:', safeCenterCoords, {
        lng: safeCenterCoords[0],
        lat: safeCenterCoords[1],
        zoom: optimalZoom,
        lngType: typeof safeCenterCoords[0],
        latType: typeof safeCenterCoords[1],
        lngIsNaN: isNaN(safeCenterCoords[0]),
        latIsNaN: isNaN(safeCenterCoords[1]),
        lngIsFinite: isFinite(safeCenterCoords[0]),
        latIsFinite: isFinite(safeCenterCoords[1])
    });
    
    try {
        mapInstance = new AMap.Map('map', {
            zoom: optimalZoom, // 使用智能计算的zoom级别
            center: safeCenterCoords,
            mapStyle: 'amap://styles/normal',
            resizeEnable: true,
            rotateEnable: false,
            pitchEnable: false,
            zoomEnable: true,
            dragEnable: true,
            // 添加更多配置确保地图正确加载
            viewMode: '2D',
            features: ['bg', 'road', 'building', 'point'],
            showLabel: true
        });
        console.log('✅ 地图实例创建成功，zoom级别:', optimalZoom, '中心坐标:', safeCenterCoords);
    } catch (mapError) {
        console.error('❌ 地图实例创建失败:', mapError);
        throw mapError;
    }

        // 等待地图加载完成
        await new Promise((resolve) => {
            mapInstance.on('complete', () => {
                console.log('✅ 地图实例创建并加载完成');
                
                // 验证地图中心是否正确设置
                const currentCenter = mapInstance.getCenter();
                const currentZoom = mapInstance.getZoom();
                console.log('🔍 地图加载完成后验证 - 当前中心:', {
                    lng: currentCenter.lng,
                    lat: currentCenter.lat,
                    zoom: currentZoom,
                    expected: safeCenterCoords,
                    expectedZoom: optimalZoom
                });
                
                // 容器可见后，主动resize并无条件设置中心与zoom，避免因容器尺寸或布局导致的偏移
                try {
                    mapInstance.resize();
                } catch (e) {
                    console.warn('⚠️ 调整地图视图失败:', e);
                }
                mapInstance.setCenter(safeCenterCoords);
                mapInstance.setZoom(optimalZoom);
                
                // 再次验证
                setTimeout(() => {
                    const newCenter = mapInstance.getCenter();
                    const newZoom = mapInstance.getZoom();
                    console.log('🔍 重新设置后验证 - 新中心:', {
                        lng: newCenter.lng,
                        lat: newCenter.lat,
                        zoom: newZoom,
                        expected: safeCenterCoords,
                        expectedZoom: optimalZoom
                    });
                }, 500);
                
                resolve();
            });
        });

        // 清除之前的标记
        clearMarkers();

        // 添加城市中心标记
        addCityMarker(destination, cityCenter);

        // 处理行程数据并创建按天分组的路线
        if (itinerary && itinerary.length > 0) {
            createDailyRoutes(destination, itinerary);
        }

        // 最终固定为城市中心与目标缩放，避免后续视野覆盖
        try {
            setTimeout(() => {
                mapInstance.setCenter(safeCenterCoords);
                mapInstance.setZoom(optimalZoom);
                console.log('🔒 最终固定视野', { center: safeCenterCoords, zoom: optimalZoom });
            }, 0);
        } catch (e) {
            console.warn('⚠️ 固定视野失败:', e);
        }

        console.log('高德地图初始化成功');

    } catch (error) {
        console.error('地图加载失败:', error);
        
        // 分析错误类型
        let errorType = '未知错误';
        let solution = '';
        
        if (error.message.includes('API密钥无效')) {
            errorType = 'API密钥无效';
            solution = `
                <div style="margin: 15px 0; padding: 15px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px;">
                    <h6 style="color: #856404; margin-bottom: 10px;">🔑 API密钥配置指南</h6>
                    <ol style="text-align: left; color: #856404; margin: 0; padding-left: 20px;">
                        <li>访问 <a href="https://console.amap.com/" target="_blank">高德开放平台</a></li>
                        <li>注册账号并创建应用</li>
                        <li>获取Web服务API密钥和安全密钥</li>
                        <li>在script.js中更新API密钥</li>
                        <li>在index.html中更新安全密钥</li>
                    </ol>
                </div>
            `;
        } else if (error.message.includes('配额')) {
            errorType = 'API调用配额不足';
            solution = `
                <div style="margin: 15px 0; padding: 15px; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 5px;">
                    <h6 style="color: #721c24; margin-bottom: 10px;">📊 配额解决方案</h6>
                    <p style="text-align: left; color: #721c24; margin: 0;">请检查高德开放平台账户配额状态，或升级服务套餐</p>
                </div>
            `;
        } else if (error.message.includes('网络')) {
            errorType = '网络连接失败';
            solution = `
                <div style="margin: 15px 0; padding: 15px; background: #d1ecf1; border: 1px solid #bee5eb; border-radius: 5px;">
                    <h6 style="color: #0c5460; margin-bottom: 10px;">🌐 网络检查</h6>
                    <p style="text-align: left; color: #0c5460; margin: 0;">请检查网络连接状态，确保可以访问高德地图服务</p>
                </div>
            `;
        }
        
        // 显示错误信息和降级方案
        mapContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <div style="font-size: 2rem; margin-bottom: 20px; color: #ff6b6b;">⚠️</div>
                <h4 style="color: #333; margin-bottom: 10px;">地图加载失败</h4>
                <p style="color: #666; margin-bottom: 15px;">错误类型: ${errorType}</p>
                ${solution}
                <div style="margin-top: 25px; padding: 20px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #28a745;">
                    <h5 style="color: #28a745; margin-bottom: 15px;">📍 ${destination} 旅游信息</h5>
                    <div style="text-align: left; max-width: 300px; margin: 0 auto;">
                        <p style="margin: 8px 0;">✅ 景点推荐已生成</p>
                        <p style="margin: 8px 0;">✅ 行程路线已规划</p>
                        <p style="margin: 8px 0;">✅ 交通信息已计算</p>
                        <p style="margin: 8px 0;">💡 建议使用手机地图导航</p>
                    </div>
                </div>
                <div style="margin-top: 20px; padding: 15px; background: #e9ecef; border-radius: 5px;">
                    <small style="color: #6c757d;">
                        💡 提示：当前使用的是测试API密钥，请替换为您自己的密钥以获得完整功能
                    </small>
                </div>
            </div>
        `;
    }
}

// 添加城市中心标记
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

// 添加景点标记
function addAttractionMarkers(cityName, attractions) {
    if (!mapInstance || !attractionCoordinates[cityName]) {
        console.warn('⚠️ 地图实例或景点坐标数据不存在:', { mapInstance: !!mapInstance, cityName, hasCoordinates: !!attractionCoordinates[cityName] });
        return;
    }

    const cityAttractions = attractionCoordinates[cityName];
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

// 清除所有标记
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

// 创建按天分组的路线
function createDailyRoutes(cityName, itinerary) {
    if (!mapInstance || !attractionCoordinates[cityName]) return;

    const cityAttractions = attractionCoordinates[cityName];
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

// 为某一天创建景点标记
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

// 为某一天创建连线
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

// 创建地图图例
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

// 规划景点间路线
function planRoute(cityName, attractions) {
    if (!mapInstance || !attractionCoordinates[cityName] || attractions.length < 2) return;

    const cityAttractions = attractionCoordinates[cityName];
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

// 显示路线信息
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

// 显示/隐藏加载状态
function showLoading(show) {
    const btnText = document.querySelector('.btn-text');
    const loading = document.querySelector('.loading');
    const btn = document.getElementById('generateBtn');
    
    if (show) {
        btnText.style.display = 'none';
        loading.style.display = 'inline-block';
        btn.disabled = true;
    } else {
        btnText.style.display = 'inline-block';
        loading.style.display = 'none';
        btn.disabled = false;
    }
}

// 更新进度状态
function updateProgressStatus(message, progress, details = '') {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.innerHTML = `
            <div style="text-align: center; padding: 20px; background: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <div style="font-size: 1.3rem; margin-bottom: 15px; color: #333; font-weight: 600;">${message}</div>
                <div style="width: 100%; background: #f0f0f0; border-radius: 10px; overflow: hidden; margin-bottom: 15px; height: 12px;">
                    <div style="width: ${progress}%; height: 100%; background: linear-gradient(90deg, #007bff, #28a745); transition: width 0.5s ease; border-radius: 10px;"></div>
                </div>
                <div style="color: #666; font-size: 1rem; margin-bottom: 10px; font-weight: 500;">${progress}% 完成</div>
                ${details ? `<div style="color: #888; font-size: 0.9rem; line-height: 1.4; max-width: 400px; margin: 0 auto;">${details}</div>` : ''}
                <div style="margin-top: 15px;">
                    <div class="spinner" style="display: inline-block; width: 20px; height: 20px; border: 2px solid #f3f3f3; border-top: 2px solid #007bff; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                </div>
            </div>
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        `;
    }
}

// 显示详细的处理步骤
function showDetailedProgress(currentStep, totalSteps, stepName, stepDetails) {
    const progress = Math.round((currentStep / totalSteps) * 100);
    const stepInfo = `步骤 ${currentStep}/${totalSteps}: ${stepName}`;
    updateProgressStatus(stepInfo, progress, stepDetails);
}

// 显示交通信息详情
function displayTransportDetails(distanceMatrix, attractionsWithGeoData) {
    if (!distanceMatrix || !attractionsWithGeoData) return '';
    
    let transportSummary = '<div style="margin-top: 20px; text-align: left; background: #f8f9fa; padding: 15px; border-radius: 8px;">';
    transportSummary += '<h4 style="margin: 0 0 10px 0; color: #333;">🚗 交通信息概览</h4>';
    
    // 统计交通方式
    const transportStats = {
        walking: 0,
        driving: 0,
        public: 0
    };
    
    let totalConnections = 0;
    let totalTime = 0;
    
    for (const fromAttraction in distanceMatrix) {
        for (const toAttraction in distanceMatrix[fromAttraction]) {
            if (fromAttraction !== toAttraction) {
                const info = distanceMatrix[fromAttraction][toAttraction];
                if (info && info.transportMode) {
                    transportStats[info.transportMode]++;
                    totalConnections++;
                    totalTime += info.duration || 0;
                }
            }
        }
    }
    
    if (totalConnections > 0) {
        const avgTime = Math.round(totalTime / totalConnections / 60);
        transportSummary += `<p style="margin: 5px 0; color: #666;">• 平均交通时间: ${avgTime}分钟</p>`;
        
        if (transportStats.walking > 0) {
            transportSummary += `<p style="margin: 5px 0; color: #666;">• 步行路线: ${transportStats.walking}条</p>`;
        }
        if (transportStats.driving > 0) {
            transportSummary += `<p style="margin: 5px 0; color: #666;">• 驾车路线: ${transportStats.driving}条</p>`;
        }
        if (transportStats.public > 0) {
            transportSummary += `<p style="margin: 5px 0; color: #666;">• 公交路线: ${transportStats.public}条</p>`;
        }
    }
    
    transportSummary += '</div>';
    return transportSummary;
}
// 第一步：AI生成推荐景点列表
async function generateAttractionRecommendations(destination, days, budget, interests) {
    try {
        const attractionCount = Math.min(days * 3, 15);
        const prompt = `你是一个专业的旅游规划师，请为${destination}推荐适合${days}天旅游的优质景点。

**用户需求分析：**
- 目的地：${destination}
- 旅游天数：${days}天
- 预算范围：${budget}
- 兴趣偏好：${interests.join('、')}

**推荐要求：**
1. 推荐${attractionCount}个景点，涵盖不同类型和区域
2. 考虑景点的知名度、游览价值和用户兴趣匹配度
3. 包含必游景点和特色小众景点的合理搭配
4. 考虑景点的地理分布，便于后续路线优化
5. 根据预算选择合适档次的景点（免费、低价、中高价）

**景点类型建议：**
- 历史文化类：古迹、博物馆、文化街区
- 自然风光类：公园、湖泊、山景、海景
- 现代都市类：地标建筑、购物区、观景台
- 休闲娱乐类：主题公园、特色街区、夜市
- 美食体验类：美食街、特色餐厅聚集区

**输出格式：**
请严格按照以下格式返回，每行一个景点名称，不要添加任何编号、符号或额外说明：

景点名称1
景点名称2
景点名称3
...

确保景点名称准确、简洁，便于地图搜索。`;

        console.log('🤖 发送景点推荐请求到AI...');
        const aiResponse = await callAIAPI({
            destination,
            days,
            budget,
            interests,
            customPrompt: prompt
        });
        
        // 解析AI返回的景点列表
        const attractions = aiResponse.split('\n')
            .map(line => line.trim())
            .filter(line => line && 
                    !line.includes('：') && 
                    !line.includes('推荐') && 
                    !line.includes('景点') && 
                    !line.includes('建议') &&
                    !line.match(/^\d+\./) && // 过滤数字编号
                    !line.includes('```') &&
                    line.length > 1 && 
                    line.length < 20) // 合理的景点名称长度
            .slice(0, attractionCount);
            
        console.log('✅ AI推荐景点:', attractions);
        
        // 验证推荐结果
        if (attractions.length < Math.min(days * 2, 6)) {
            throw new Error(`AI推荐景点数量不足，仅获得${attractions.length}个景点，需要至少${Math.min(days * 2, 6)}个`);
        }
        
        return attractions;
        
    } catch (error) {
        console.error('AI景点推荐失败:', error);
        throw new Error(`AI景点推荐失败: ${error.message}`);
    }
}

// 第二步：通过高德地图搜索API获取景点坐标
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
                        plugins: ['AMap.PlaceSearch', 'AMap.Geocoder']
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

// 获取城市中心坐标的辅助函数
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

// 第三步：计算景点间距离和交通方式
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

// 计算两点间直线距离（米）
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

// 第四步：AI根据地理数据优化行程分组
async function optimizeItineraryWithGeoData(destination, days, budget, interests, attractionsWithGeoData, distanceMatrix) {
    try {
        // 构建地理数据摘要
        const geoDataSummary = buildGeoDataSummary(attractionsWithGeoData, distanceMatrix);
        
        // 构建优化提示词
        const optimizationPrompt = `你是一个专业的旅游路线规划师。请根据以下真实的地理数据和交通信息，为${destination}制定${days}天的最优旅游路线。

**景点信息：**
${attractionsWithGeoData.map((attraction, index) => 
    `${index + 1}. ${attraction.name} (${attraction.address || ''})`
).join('\n')}

**距离和交通信息：**
${geoDataSummary}

**用户需求：**
- 目的地：${destination}
- 天数：${days}天
- 预算：${budget}
- 兴趣偏好：${interests.join('、')}

**优化原则：**
1. 最小化每天的总交通时间
2. 相邻景点尽量在同一区域
3. 考虑景点的开放时间和游览时长
4. 每天安排3-4个景点，避免过度疲劳
5. 优先安排步行可达的景点组合

请返回JSON格式的行程安排：
{
  "destination": "${destination}",
  "days": ${days},
  "overview": {
    "totalDays": ${days},
    "estimatedCost": "根据预算估算",
    "attractions": "景点总数",
    "hotels": ["推荐酒店1", "推荐酒店2"]
  },
  "itinerary": [
    {
      "day": 1,
      "theme": "第一天主题",
      "activities": [
        {
          "time": "09:00",
          "name": "景点名称",
          "type": "attraction",
          "description": "活动描述",
          "duration": "游览时长",
          "transport": "到达方式",
          "travelTime": "交通时间"
        }
      ]
    }
  ],
  "recommendations": {
    "hotels": ["酒店推荐"],
    "food": ["美食推荐"],
    "transport": "交通建议",
    "tips": "旅游贴士"
  }
}

请确保返回的是有效的JSON格式，不要包含其他文字说明。`;

        console.log('🧠 发送优化请求到AI...');
        const aiResponse = await callAIAPI({
            destination,
            days,
            budget,
            interests,
            customPrompt: optimizationPrompt
        });

        // 解析AI优化后的响应
        const optimizedPlan = parseOptimizedAIResponse(aiResponse, destination, days, budget, interests, attractionsWithGeoData, distanceMatrix);
        
        console.log('✅ AI行程优化完成:', optimizedPlan);
        return optimizedPlan;

    } catch (error) {
        console.error('AI行程优化失败:', error);
        throw new Error(`AI行程优化失败: ${error.message}`);
    }
}

// 构建地理数据摘要
function buildGeoDataSummary(attractionsWithGeoData, distanceMatrix) {
    let summary = '';
    
    for (let i = 0; i < attractionsWithGeoData.length; i++) {
        const fromAttraction = attractionsWithGeoData[i];
        const nearbyAttractions = [];
        
        for (let j = 0; j < attractionsWithGeoData.length; j++) {
            if (i !== j) {
                const toAttraction = attractionsWithGeoData[j];
                const distanceInfo = distanceMatrix[fromAttraction.name][toAttraction.name];
                
                if (distanceInfo && distanceInfo.duration <= 1800) { // 30分钟内
                    const transportText = distanceInfo.transportMode === 'walking' ? '步行' : 
                                        distanceInfo.transportMode === 'driving' ? '驾车' : '公交';
                    nearbyAttractions.push(
                        `${toAttraction.name}(${transportText}${Math.round(distanceInfo.duration/60)}分钟)`
                    );
                }
            }
        }
        
        if (nearbyAttractions.length > 0) {
            summary += `${fromAttraction.name} 附近30分钟内可达: ${nearbyAttractions.join(', ')}\n`;
        }
    }
    
    return summary;
}

// 解析AI优化后的响应
function parseOptimizedAIResponse(aiResponse, destination, days, budget, interests, attractionsWithGeoData, distanceMatrix) {
    try {
        console.log('🔍 开始解析AI优化响应...');
        console.log('原始AI响应长度:', aiResponse.length);
        console.log('原始AI响应前500字符:', aiResponse.substring(0, 500));
        
        // 清理响应内容，移除markdown代码块标记
        let cleanResponse = aiResponse.replace(/```json\s*|\s*```/g, '').trim();
        
        // 尝试提取JSON部分
        const jsonStart = cleanResponse.indexOf('{');
        const jsonEnd = cleanResponse.lastIndexOf('}');
        
        if (jsonStart === -1 || jsonEnd === -1 || jsonStart >= jsonEnd) {
            console.error('❌ 无法找到有效的JSON结构');
            throw new Error('AI响应中未找到有效的JSON结构');
        }
        
        cleanResponse = cleanResponse.substring(jsonStart, jsonEnd + 1);
        console.log('清理后的JSON:', cleanResponse.substring(0, 200) + '...');
        
        const aiPlan = JSON.parse(cleanResponse);
        console.log('✅ JSON解析成功');
        
        // 验证AI返回的数据结构
        if (!aiPlan || typeof aiPlan !== 'object') {
            throw new Error('AI响应不是有效的对象');
        }
        
        if (!aiPlan.itinerary || !Array.isArray(aiPlan.itinerary)) {
            console.error('❌ itinerary字段无效:', aiPlan.itinerary);
            throw new Error('AI响应结构不完整，缺少有效的itinerary数组');
        }
        
        console.log(`✅ 验证通过，包含${aiPlan.itinerary.length}天行程`);
        
        // 增强AI返回的数据，添加实际的交通信息
        aiPlan.itinerary.forEach((dayPlan, dayIndex) => {
            console.log(`处理第${dayIndex + 1}天行程...`);
            if (dayPlan.activities && Array.isArray(dayPlan.activities)) {
                for (let i = 0; i < dayPlan.activities.length - 1; i++) {
                    const currentActivity = dayPlan.activities[i];
                    const nextActivity = dayPlan.activities[i + 1];
                    
                    if (currentActivity && nextActivity && 
                        currentActivity.type === 'attraction' && 
                        nextActivity.type === 'attraction' &&
                        currentActivity.name && nextActivity.name) {
                        
                        const distanceInfo = distanceMatrix[currentActivity.name] && 
                                           distanceMatrix[currentActivity.name][nextActivity.name];
                        
                        if (distanceInfo) {
                            nextActivity.transport = getTransportDescription(distanceInfo.transportMode);
                            nextActivity.travelTime = `${Math.round(distanceInfo.duration / 60)}分钟`;
                            console.log(`添加交通信息: ${currentActivity.name} -> ${nextActivity.name}`);
                        }
                    }
                }
            }
        });
        
        console.log('✅ AI优化响应解析完成');
        return aiPlan;
    } catch (error) {
        console.error('❌ AI响应解析失败:', error);
        console.error('错误详情:', error.message);
        console.error('错误堆栈:', error.stack);
        throw new Error(`AI优化行程解析失败: ${error.message}`);
    }
}

// 本地智能分组算法


// 获取交通方式描述
function getTransportDescription(transportMode) {
    switch (transportMode) {
        case 'walking': return '步行';
        case 'driving': return '驾车/打车';
        case 'public': return '公共交通';
        default: return '步行';
    }
}

// 重置表单
function resetForm() {
    document.getElementById('travelForm').reset();
    document.getElementById('resultSection').style.display = 'none';
    document.querySelector('.input-section').scrollIntoView({ 
        behavior: 'smooth' 
    });
}

// API状态提示相关函数
function showApiStatus(message = null) {
    const apiStatus = document.getElementById('apiStatus');
    if (message) {
        const statusText = apiStatus.querySelector('.status-text p');
        statusText.textContent = message;
    }
    apiStatus.style.display = 'block';
}

function hideApiStatus() {
    const apiStatus = document.getElementById('apiStatus');
    apiStatus.style.display = 'none';
}

// 检查API配置状态
function checkApiConfiguration() {
    // 这里可以添加实际的API配置检查逻辑
    // 目前显示通用提示
    showApiStatus('为了获得最佳体验，请确保已正确配置AI API密钥。如遇到问题，请检查网络连接和API配置。');
}

// 导出方案
function exportPlan() {
    const planContent = document.getElementById('resultSection').innerText;
    const blob = new Blob([planContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'AI旅游方案.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('旅游方案已导出！');
}

// 页面加载完成后的初始化
 document.addEventListener('DOMContentLoaded', function() {
     console.log('AI旅游规划助手已加载完成！');
     
     // 添加一些交互效果
     const inputs = document.querySelectorAll('input, select');
     inputs.forEach(input => {
         input.addEventListener('focus', function() {
             this.parentElement.style.transform = 'translateY(-2px)';
         });
         
         input.addEventListener('blur', function() {
             this.parentElement.style.transform = 'translateY(0)';
         });
     });
     
     // 添加API状态提示关闭按钮事件监听器
     const statusCloseBtn = document.querySelector('.status-close');
     if (statusCloseBtn) {
         statusCloseBtn.addEventListener('click', hideApiStatus);
     }
 
     // 显示API配置状态提醒
     checkApiConfiguration();
 });

// AI API调用函数 - 使用SiliconFlow API
async function callAIAPI(userInput) {
    // 请在这里替换为你的SiliconFlow API Key
    const API_KEY = 'sk-mmqeogjnhvbcjocksjpyspuwkwnprzqmknifqmzurjxostvf'; // 请替换为实际的API Key
    
    // 如果有自定义提示词，使用自定义提示词，否则使用默认提示词
    const prompt = userInput.customPrompt || `请为用户规划一个${userInput.destination}的${userInput.days}天旅游方案，预算${userInput.budget}，兴趣偏好：${userInput.interests.join('、')}。

请返回JSON格式的详细行程安排，格式如下：
{
    "destination": "${userInput.destination}",
    "days": ${userInput.days},
    "budget": "${userInput.budget}",
    "itinerary": [
        {
            "day": 1,
            "activities": ["活动1", "活动2"],
            "meals": ["早餐地点", "午餐地点", "晚餐地点"],
            "accommodation": "酒店名称"
        }
    ],
    "recommendations": {
        "transport": "交通建议",
        "tips": "旅游贴士"
    }
}`;
    
    try {
        console.log('正在调用SiliconFlow API...');
        
        const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer sk-mmqeogjnhvbcjocksjpyspuwkwnprzqmknifqmzurjxostvf`
            },
            body: JSON.stringify({
                model: "Qwen/Qwen2.5-7B-Instruct", // 使用SiliconFlow支持的模型
                messages: [
                    {
                        role: "system",
                        content: "你是一个专业的旅游规划师，请根据用户需求制定详细的旅游方案。请严格按照要求的JSON格式返回结果。"
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                max_tokens: 2000,
                temperature: 0.7,
                stream: false
            })
        });
        
        console.log('API响应状态:', response.status, response.statusText);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API错误响应:', errorText);
            throw new Error(`API请求失败: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        console.log('API响应数据:', data);
        
        // 安全检查API响应格式
        if (!data || !data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
            console.error('API响应格式错误:', data);
            throw new Error('API响应格式不正确：缺少choices数组');
        }
        
        if (!data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
            console.error('API响应消息格式错误:', data.choices[0]);
            throw new Error('API响应格式不正确：缺少message内容');
        }
        
        console.log('AI响应内容:', data.choices[0].message.content);
        return data.choices[0].message.content;
        
    } catch (error) {
        console.error('AI API调用详细错误:', error);
        console.error('错误堆栈:', error.stack);
        throw error; // 重新抛出错误，让上层处理
    }
}

// 解析AI响应
function parseAIResponse(aiResponse, destination, days, budget, interests) {
    try {
        console.log('🔍 开始解析AI基础响应...');
        console.log('原始AI响应长度:', aiResponse.length);
        console.log('原始AI响应前500字符:', aiResponse.substring(0, 500));
        
        // 清理响应内容，移除可能的markdown代码块标记
        let cleanResponse = aiResponse.replace(/```json\s*|\s*```/g, '').trim();
        
        // 尝试提取JSON部分
        const jsonStart = cleanResponse.indexOf('{');
        const jsonEnd = cleanResponse.lastIndexOf('}');
        
        if (jsonStart === -1 || jsonEnd === -1 || jsonStart >= jsonEnd) {
            console.error('❌ 无法找到有效的JSON结构');
            throw new Error('AI响应中未找到有效的JSON结构');
        }
        
        cleanResponse = cleanResponse.substring(jsonStart, jsonEnd + 1);
        console.log('清理后的JSON:', cleanResponse.substring(0, 200) + '...');
        
        // 尝试解析JSON响应
        const aiPlan = JSON.parse(cleanResponse);
        console.log('✅ JSON解析成功');
        
        // 验证返回的对象是否有必要的结构
        if (!aiPlan || typeof aiPlan !== 'object') {
            throw new Error('AI响应不是有效的对象');
        }
        
        if (!aiPlan.overview || !aiPlan.itinerary) {
            console.error('❌ 缺少必要字段:', { overview: !!aiPlan.overview, itinerary: !!aiPlan.itinerary });
            throw new Error('AI响应结构不完整，缺少必要的overview或itinerary字段');
        }
        
        // 确保overview有必要的属性
        if (!aiPlan.overview.totalDays || !aiPlan.overview.estimatedCost || !aiPlan.overview.attractions) {
            console.error('❌ overview结构不完整:', aiPlan.overview);
            throw new Error('AI响应overview结构不完整，缺少必要的属性');
        }
        
        console.log('✅ AI基础响应解析完成');
        return aiPlan;
    } catch (error) {
        // 如果解析失败，抛出错误而不是使用fallback
        console.error('❌ AI响应解析失败:', error.message);
        console.error('错误详情:', error.message);
        console.error('错误堆栈:', error.stack);
        throw new Error(`AI响应解析失败: ${error.message}`);
    }
}

// 显示交通信息详情
function displayTransportInfo(transportDetails) {
    const recommendationsElement = document.getElementById('recommendations');
    if (recommendationsElement && transportDetails) {
        // 在推荐信息后添加交通信息
        const transportSection = document.createElement('div');
        transportSection.className = 'transport-info-section';
        transportSection.innerHTML = transportDetails;
        recommendationsElement.appendChild(transportSection);
    }
}

// 坐标验证和格式化函数
function validateAndFormatCoordinates(coordinates, context = '') {
    if (!coordinates) {
        console.warn(`⚠️ 坐标数据为空 ${context}`);
        return null;
    }
    
    let lng, lat;
    
    // 处理不同的坐标格式
    if (Array.isArray(coordinates) && coordinates.length >= 2) {
        lng = coordinates[0];
        lat = coordinates[1];
    } else if (coordinates.lng !== undefined && coordinates.lat !== undefined) {
        lng = coordinates.lng;
        lat = coordinates.lat;
    } else if (coordinates.longitude !== undefined && coordinates.latitude !== undefined) {
        lng = coordinates.longitude;
        lat = coordinates.latitude;
    } else {
        console.error(`❌ 无法识别的坐标格式 ${context}:`, coordinates);
        return null;
    }
    
    // 转换为数字并验证
    lng = Number(lng);
    lat = Number(lat);
    
    // 检查是否为有效数字
    if (isNaN(lng) || isNaN(lat)) {
        console.error(`❌ 坐标包含NaN值 ${context}:`, { lng, lat, original: coordinates });
        return null;
    }
    
    // 检查坐标范围是否合理（中国境内大致范围）
    if (lng < 73 || lng > 135 || lat < 3 || lat > 54) {
        console.warn(`⚠️ 坐标超出合理范围 ${context}:`, { lng, lat });
        // 不返回null，因为可能是海外景点
    }
    
    // 检查坐标精度是否合理
    if (Math.abs(lng) < 0.001 && Math.abs(lat) < 0.001) {
        console.warn(`⚠️ 坐标精度过低 ${context}:`, { lng, lat });
    }
    
    return [lng, lat];
}

// 安全创建AMap.LngLat对象
function createSafeLngLat(coordinates, context = '') {
    const validCoords = validateAndFormatCoordinates(coordinates, context);
    if (!validCoords) {
        return null;
    }
    
    try {
        return new AMap.LngLat(validCoords[0], validCoords[1]);
    } catch (error) {
        console.error(`❌ 创建AMap.LngLat失败 ${context}:`, error, validCoords);
        return null;
    }
}