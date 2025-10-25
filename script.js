// AI旅游规划助手 - 主控制器
// 依赖模块：utils.js, data.js, map.js, weather.js, analysis.js, ai.js, ui.js

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
    
    // 获取新增的表单数据
    const travelDate = formData.get('travelDate');
    const departureCity = formData.get('departureCity');
    const timePreference = formData.get('timePreference');
    const transportPreference = formData.getAll('transportPreference');
    const crowdPreference = formData.get('crowdPreference');
    const weatherAdaptability = formData.getAll('weatherAdaptability');
    const luggage = formData.getAll('luggage');
    const specialRequirements = formData.get('specialRequirements');
    
    // 显示加载状态
    showLoading(true);
    
    try {
        // 新的分步骤流程
        console.log('🚀 开始智能路线规划...');
        
        // 第一步：查询天气信息
        showDetailedProgress(1, 6, '天气查询', `正在查询${destination}的天气信息，为您的${travelDate || '近期'}出行提供天气建议`);
        const weatherInfo = await getWeatherInfo(destination, travelDate);
        
        // 第二步：AI生成推荐景点列表
        showDetailedProgress(2, 6, 'AI景点推荐', `正在为${destination}生成${days}天的个性化景点推荐，考虑您的兴趣偏好：${interests.join('、')}`);
        const recommendedAttractions = await generateAttractionRecommendations(destination, days, budget, interests, {
            travelDate,
            departureCity,
            timePreference,
            transportPreference,
            crowdPreference,
            weatherAdaptability,
            luggage,
            specialRequirements,
            weatherInfo
        });

        // 安全校验：确保推荐景点为有效数组
        if (!Array.isArray(recommendedAttractions) || recommendedAttractions.length === 0) {
            throw new Error('AI未返回有效的景点推荐，无法继续生成方案');
        }

        const recommendedCount = recommendedAttractions.length;
        // 第三步：获取景点坐标和交通信息
        showDetailedProgress(3, 6, '地理信息获取', `正在通过高德地图API获取${recommendedCount}个景点的精确坐标和周边信息`);
        const attractionsWithGeoData = await getAttractionCoordinates(destination, recommendedAttractions);
        // 新增：构建景点坐标缓存，供地图绘制使用
        window.attractionCoordinates[destination] = {};
        attractionsWithGeoData.forEach(item => {
            if (item && item.name && item.coordinates) {
                window.attractionCoordinates[destination][item.name] = item.coordinates;
            }
        });
        
        // 第四步：计算景点间距离和交通方式
        showDetailedProgress(4, 6, '路线计算', `正在计算景点间的最优交通方式，分析步行、驾车、公交等选项`);
        const distanceMatrix = await calculateDistanceMatrix(attractionsWithGeoData);
        
        // 第五步：AI根据地理数据优化行程分组
        showDetailedProgress(5, 6, 'AI行程优化', `基于真实地理数据和交通信息，AI正在为您优化${days}天的行程安排`);
        const optimizedPlan = await optimizeItineraryWithGeoData(destination, days, budget, interests, attractionsWithGeoData, distanceMatrix, {
            travelDate,
            departureCity,
            timePreference,
            transportPreference,
            crowdPreference,
            weatherAdaptability,
            luggage,
            specialRequirements,
            weatherInfo
        });
        
        // 第六步：人流量分析和最佳游览时间推荐
        showDetailedProgress(6, 7, '人流量分析', '正在分析各景点人流量情况，为您推荐最佳游览时间');
        const crowdAnalysis = analyzeCrowdAndOptimalTime(
            attractionsWithGeoData,
            {
                timePreference,
                crowdPreference,
                travelDate
            },
            weatherInfo
        );
        
        // 第七步：显示结果和地图
        showDetailedProgress(7, 7, '地图可视化', '正在生成交互式地图，标记景点位置并绘制每日路线');
        
        // 添加交通信息到结果页面
        const transportDetails = displayTransportDetails(distanceMatrix, attractionsWithGeoData);
        if (transportDetails) {
            // 将交通信息添加到计划中
            optimizedPlan.transportDetails = transportDetails;
        }
        
        // 添加天气信息到计划中
        optimizedPlan.weatherInfo = weatherInfo;
        
        // 添加人流量分析到计划中
        optimizedPlan.crowdAnalysis = crowdAnalysis;
        
        // 生成综合决策分析
        const comprehensiveAnalysis = generateComprehensiveAnalysis(
            optimizedPlan,
            weatherInfo,
            crowdAnalysis,
            {
                timePreference,
                transportPreference,
                crowdPreference,
                weatherAdaptability,
                luggage,
                specialRequirements,
                travelDate
            }
        );
        optimizedPlan.comprehensiveAnalysis = comprehensiveAnalysis;
        
        console.log('✅ 旅游方案生成完成:', optimizedPlan);
        
        // 显示结果
        displayTravelPlan(optimizedPlan);
        
        // 隐藏加载状态
        showLoading(false);
        
    } catch (error) {
        console.error('❌ 生成旅游方案时出错:', error);
        showLoading(false);
        
        // 显示错误信息
        document.getElementById('resultSection').style.display = 'block';
        document.getElementById('resultSection').innerHTML = `
            <div class="error-container">
                <h3>😔 生成方案时遇到问题</h3>
                <p>错误信息：${error.message}</p>
                <p>请检查网络连接或稍后重试。如果问题持续存在，请联系技术支持。</p>
                <button onclick="resetForm()" class="primary-btn">重新开始</button>
            </div>
        `;
    }
}

// 显示旅游方案
function displayTravelPlan(plan) {
    // 显示结果区域
    document.getElementById('resultSection').style.display = 'block';
    
    // 显示方案概览
    displayPlanOverview(plan);
    
    // 显示天气信息（如果有）
    if (plan.weatherInfo) {
        displayWeatherInfo(plan.weatherInfo);
    }
    
    // 显示人流量分析（如果有）
    if (plan.crowdAnalysis) {
        displayCrowdAnalysis(plan.crowdAnalysis);
    }
    
    // 显示综合决策分析（如果有）
    if (plan.comprehensiveAnalysis) {
        displayComprehensiveAnalysis(plan.comprehensiveAnalysis);
    }
    
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

// 页面加载完成后的初始化
document.addEventListener('DOMContentLoaded', function() {
    // 设置默认出行日期为明天
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const travelDateInput = document.getElementById('travelDate');
    if (travelDateInput) {
        travelDateInput.value = tomorrow.toISOString().split('T')[0];
    }
    
    // 检查API配置状态
    checkApiConfiguration();
    
    // 添加系统测试按钮（开发模式）
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        const testButton = document.createElement('button');
        testButton.textContent = '🧪 运行系统测试';
        testButton.className = 'test-btn';
        testButton.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            border: none;
            padding: 10px 15px;
            border-radius: 5px;
            cursor: pointer;
            z-index: 1000;
            font-size: 12px;
        `;
        testButton.onclick = runSystemTest;
        document.body.appendChild(testButton);
    }
});