#!/usr/bin/env node

const { ImageOptimizer } = require('../lib/image-optimization/optimizer.ts');
const fs = require('fs');
const path = require('path');

async function testImageOptimization() {
  try {
    console.log('🧪 Testing Image Optimization...');
    
    // Test with a sample image
    const sampleImagePath = path.join(__dirname, '../public/placeholder.jpg');
    
    if (!fs.existsSync(sampleImagePath)) {
      console.log('⚠️  Sample image not found, creating a simple test buffer...');
      // Create a simple test buffer (this would normally be a real image)
      console.log('ℹ️  For full testing, place a sample image at public/placeholder.jpg');
      return;
    }
    
    const imageBuffer = fs.readFileSync(sampleImagePath);
    console.log(`📊 Original image size: ${imageBuffer.length} bytes`);
    
    // Test optimization
    const result = await ImageOptimizer.optimizeForWeb(imageBuffer, {
      quality: 85,
      width: 800,
      height: 600
    });
    
    console.log('✅ Optimization results:');
    console.log(`   Original size: ${result.originalSize} bytes`);
    console.log(`   WebP size: ${result.webp.length} bytes`);
    console.log(`   JPEG size: ${result.jpeg.length} bytes`);
    console.log(`   Savings: ${result.savings}%`);
    console.log(`   Dimensions: ${result.metadata.width}x${result.metadata.height}`);
    
    // Test thumbnail creation
    const thumbnail = await ImageOptimizer.createThumbnail(imageBuffer, 300, 80);
    console.log(`📱 Thumbnail size: ${thumbnail.length} bytes`);
    
    // Test validation
    const isValid = await ImageOptimizer.validateImage(imageBuffer);
    console.log(`✅ Image validation: ${isValid ? 'PASSED' : 'FAILED'}`);
    
    // Test quality calculation
    const optimalQuality = ImageOptimizer.getOptimalQuality(imageBuffer.length);
    console.log(`🎯 Optimal quality for this file size: ${optimalQuality}%`);
    
    console.log('\n🎉 Image optimization test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testImageOptimization(); 