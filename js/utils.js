/**
 * 工具函数模块
 * 包含加载状态、进度显示、表单重置、API状态管理、导出功能、系统测试等工具函数
 */

/**
 * 显示/隐藏加载状态
 * @param {boolean} show - 是否显示加载状态
 */
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

/**
 * 更新进度状态
 * @param {string} message - 进度消息
 * @param {number} progress - 进度百分比
 * @param {string} details - 详细信息
 */
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

/**
 * 显示详细的处理步骤
 * @param {number} currentStep - 当前步骤
 * @param {number} totalSteps - 总步骤数
 * @param {string} stepName - 步骤名称
 * @param {string} stepDetails - 步骤详情
 */
function showDetailedProgress(currentStep, totalSteps, stepName, stepDetails) {
    const progress = Math.round((currentStep / totalSteps) * 100);
    const stepInfo = `步骤 ${currentStep}/${totalSteps}: ${stepName}`;
    updateProgressStatus(stepInfo, progress, stepDetails);
}

/**
 * 显示交通信息详情
 * @param {Object} distanceMatrix - 距离矩阵
 * @param {Array} attractionsWithGeoData - 带地理数据的景点列表
 * @returns {string} 交通信息HTML
 */
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

/**
 * 重置表单
 */
function resetForm() {
    document.getElementById('travelForm').reset();
    document.getElementById('resultSection').style.display = 'none';
    document.querySelector('.input-section').scrollIntoView({ 
        behavior: 'smooth' 
    });
}

/**
 * 显示API状态提示
 * @param {string} message - 提示消息
 */
function showApiStatus(message = null) {
    const apiStatus = document.getElementById('apiStatus');
    if (message) {
        const statusText = apiStatus.querySelector('.status-text p');
        statusText.textContent = message;
    }
    apiStatus.style.display = 'block';
}

/**
 * 隐藏API状态提示
 */
function hideApiStatus() {
    const apiStatus = document.getElementById('apiStatus');
    apiStatus.style.display = 'none';
}

/**
 * 检查API配置状态
 */
function checkApiConfiguration() {
    // 这里可以添加实际的API配置检查逻辑
    // 目前显示通用提示
    showApiStatus('为了获得最佳体验，请确保已正确配置AI API密钥。如遇到问题，请检查网络连接和API配置。');
}

/**
 * 导出旅游方案
 */
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

/**
 * 系统功能测试函数
 * @returns {boolean} 测试是否通过
 */
function runSystemTest() {
    console.log('🧪 开始系统功能测试...');
    
    // 测试1: 检查所有必要的DOM元素
    const requiredElements = [
        'weatherInfo',
        'crowdAnalysis', 
        'comprehensiveAnalysis',
        'planOverview',
        'itinerary',
        'recommendations'
    ];
    
    let missingElements = [];
    requiredElements.forEach(id => {
        if (!document.getElementById(id)) {
            missingElements.push(id);
        }
    });
    
    if (missingElements.length > 0) {
        console.error('❌ 缺少DOM元素:', missingElements);
        return false;
    }
    console.log('✅ 所有DOM元素检查通过');
    
    // 测试2: 检查关键函数是否存在
    const requiredFunctions = [
        'getWeatherInfo',
        'analyzeCrowdAndOptimalTime',
        'generateComprehensiveAnalysis',
        'displayWeatherInfo',
        'displayCrowdAnalysis',
        'displayComprehensiveAnalysis'
    ];
    
    let missingFunctions = [];
    requiredFunctions.forEach(funcName => {
        if (typeof window[funcName] !== 'function') {
            missingFunctions.push(funcName);
        }
    });
    
    if (missingFunctions.length > 0) {
        console.error('❌ 缺少函数:', missingFunctions);
        return false;
    }
    console.log('✅ 所有关键函数检查通过');
    
    // 测试3: 测试天气信息显示
    try {
        const mockWeatherInfo = {
            current: {
                weather: '晴',
                temperature: 25,
                humidity: 60,
                windDirection: '东南风',
                windPower: '3级'
            },
            forecast: [
                { date: '今天', weather: '晴', tempHigh: 28, tempLow: 18 },
                { date: '明天', weather: '多云', tempHigh: 26, tempLow: 16 }
            ]
        };
        displayWeatherInfo(mockWeatherInfo);
        console.log('✅ 天气信息显示功能测试通过');
    } catch (error) {
        console.error('❌ 天气信息显示测试失败:', error);
        return false;
    }
    
    // 测试4: 测试人流量分析
    try {
        const mockCrowdAnalysis = {
            recommendations: ['早晨8-9点人流量最少', '下午2-3点人流量最大'],
            attractions: [
                {
                    name: '测试景点',
                    optimalTimes: ['8:00', '9:00'],
                    avoidTimes: ['14:00', '15:00'],
                    tips: ['建议早上游览']
                }
            ]
        };
        displayCrowdAnalysis(mockCrowdAnalysis);
        console.log('✅ 人流量分析功能测试通过');
    } catch (error) {
        console.error('❌ 人流量分析测试失败:', error);
        return false;
    }
    
    // 测试5: 测试综合决策分析
    try {
        const mockAnalysis = {
            score: 85,
            pros: ['天气晴朗', '人流量适中'],
            cons: ['价格较高'],
            risks: ['无明显风险'],
            recommendations: ['建议提前预订']
        };
        displayComprehensiveAnalysis(mockAnalysis);
        console.log('✅ 综合决策分析功能测试通过');
    } catch (error) {
        console.error('❌ 综合决策分析测试失败:', error);
        return false;
    }
    
    console.log('🎉 所有系统功能测试通过！');
    return true;
}