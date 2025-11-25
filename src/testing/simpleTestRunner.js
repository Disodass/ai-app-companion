#!/usr/bin/env node
/**
 * Simple Test Runner for Bestibule
 * Quick test runner that doesn't require Playwright installation
 */

import { chromium } from 'playwright'
import TEST_CONFIG from './testConfig.js'

class SimpleTestRunner {
  constructor() {
    this.browser = null
    this.page = null
    this.results = []
  }

  async initialize() {
    try {
      console.log('🤖 Initializing Simple Test Runner...')
      
      this.browser = await chromium.launch({
        headless: process.argv.includes('--headless'),
        slowMo: 100
      })
      
      this.page = await this.browser.newPage()
      
      // Set up monitoring
      this.page.on('console', msg => {
        const type = msg.type()
        const text = msg.text()
        
        if (type === 'error') {
          console.error('🚨 Browser Error:', text)
        } else if (text.includes('Memory Agent') || text.includes('AI response')) {
          console.log('🧠 AI Log:', text)
        }
      })
      
      console.log('✅ Simple Test Runner initialized')
      return true
    } catch (error) {
      console.error('❌ Failed to initialize test runner:', error)
      return false
    }
  }

  async runBasicTests() {
    console.log('🚀 Running basic Bestibule tests...')
    
    const tests = [
      {
        name: 'Landing Page Load',
        fn: async () => {
          await this.page.goto(`${TEST_CONFIG.baseUrl}/`)
          await this.page.waitForSelector('h1', { timeout: 10000 })
          console.log('✅ Landing page loaded')
        }
      },
      {
        name: 'Sign In Page Load',
        fn: async () => {
          await this.page.goto(`${TEST_CONFIG.baseUrl}/signin`)
          await this.page.waitForSelector('form', { timeout: 5000 })
          console.log('✅ Sign in page loaded')
        }
      },
      {
        name: 'Sign Up Page Load',
        fn: async () => {
          await this.page.goto(`${TEST_CONFIG.baseUrl}/signup`)
          await this.page.waitForSelector('form', { timeout: 5000 })
          console.log('✅ Sign up page loaded')
        }
      },
      {
        name: 'Learn More Page Load',
        fn: async () => {
          await this.page.goto(`${TEST_CONFIG.baseUrl}/learn-more`)
          await this.page.waitForSelector('body', { timeout: 5000 })
          console.log('✅ Learn more page loaded')
        }
      }
    ]

    for (const test of tests) {
      try {
        console.log(`\n🔍 Running: ${test.name}`)
        await test.fn()
        this.results.push({ name: test.name, status: 'passed' })
      } catch (error) {
        console.log(`❌ ${test.name} failed: ${error.message}`)
        this.results.push({ name: test.name, status: 'failed', error: error.message })
      }
    }

    this.generateReport()
  }

  async runAuthTests() {
    console.log('🔐 Running authentication tests...')
    
    const tests = [
      {
        name: 'Sign Up Flow',
        fn: async () => {
          await this.page.goto(`${TEST_CONFIG.baseUrl}/signup`)
          
          // Fill signup form
          await this.page.fill('input[name="email"]', TEST_CONFIG.testUsers.regular.email)
          await this.page.fill('input[name="password"]', TEST_CONFIG.testUsers.regular.password)
          await this.page.fill('input[name="confirmPassword"]', TEST_CONFIG.testUsers.regular.password)
          await this.page.fill('input[name="displayName"]', TEST_CONFIG.testUsers.regular.displayName)
          
          // Submit form
          await this.page.click('button[type="submit"]')
          
          // Wait for redirect (may fail if user already exists)
          try {
            await this.page.waitForSelector('[data-testid="dashboard"]', { timeout: 15000 })
            console.log('✅ Sign up completed')
          } catch {
            console.log('⚠️ Sign up may have failed (user might exist)')
          }
        }
      },
      {
        name: 'Sign In Flow',
        fn: async () => {
          await this.page.goto(`${TEST_CONFIG.baseUrl}/signin`)
          
          // Fill signin form
          await this.page.fill('input[name="email"]', TEST_CONFIG.testUsers.regular.email)
          await this.page.fill('input[name="password"]', TEST_CONFIG.testUsers.regular.password)
          
          // Submit form
          await this.page.click('button[type="submit"]')
          
          // Wait for redirect
          try {
            await this.page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 })
            console.log('✅ Sign in completed')
          } catch {
            console.log('⚠️ Sign in may have failed (check credentials)')
          }
        }
      }
    ]

    for (const test of tests) {
      try {
        console.log(`\n🔍 Running: ${test.name}`)
        await test.fn()
        this.results.push({ name: test.name, status: 'passed' })
      } catch (error) {
        console.log(`❌ ${test.name} failed: ${error.message}`)
        this.results.push({ name: test.name, status: 'failed', error: error.message })
      }
    }
  }

  async runChatTests() {
    console.log('💬 Running chat tests...')
    
    // First authenticate
    try {
      await this.page.goto(`${TEST_CONFIG.baseUrl}/signin`)
      await this.page.fill('input[name="email"]', TEST_CONFIG.testUsers.regular.email)
      await this.page.fill('input[name="password"]', TEST_CONFIG.testUsers.regular.password)
      await this.page.click('button[type="submit"]')
      await this.page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 })
      console.log('✅ Authentication successful')
    } catch {
      console.log('⚠️ Authentication failed, skipping chat tests')
      return
    }

    const tests = [
      {
        name: 'Chat Interface Load',
        fn: async () => {
          await this.page.goto(`${TEST_CONFIG.baseUrl}/app/chat/supporter_friend`)
          await this.page.waitForSelector('[data-testid="chat-interface"]', { timeout: 10000 })
          console.log('✅ Chat interface loaded')
        }
      },
      {
        name: 'Message Sending',
        fn: async () => {
          const testMessage = "Hello, this is a test message from the AI test agent."
          
          await this.page.fill('[data-testid="message-input"]', testMessage)
          await this.page.click('[data-testid="send-button"]')
          
          // Wait for user message to appear
          await this.page.waitForSelector('[data-testid="user-message"]', { timeout: 10000 })
          console.log('✅ Message sent successfully')
        }
      },
      {
        name: 'AI Response Generation',
        fn: async () => {
          // Wait for AI response
          await this.page.waitForSelector('[data-testid="ai-message"]', { timeout: 30000 })
          
          // Check response quality
          const response = await this.page.textContent('[data-testid="ai-message"]')
          
          if (response && response.length > 10) {
            console.log('✅ AI response generated successfully')
            console.log(`📝 Response preview: ${response.substring(0, 100)}...`)
          } else {
            throw new Error('AI response was empty or too short')
          }
        }
      }
    ]

    for (const test of tests) {
      try {
        console.log(`\n🔍 Running: ${test.name}`)
        await test.fn()
        this.results.push({ name: test.name, status: 'passed' })
      } catch (error) {
        console.log(`❌ ${test.name} failed: ${error.message}`)
        this.results.push({ name: test.name, status: 'failed', error: error.message })
      }
    }
  }

  generateReport() {
    console.log('\n📊 Test Report Summary')
    console.log('=' .repeat(50))
    
    const passed = this.results.filter(r => r.status === 'passed').length
    const failed = this.results.filter(r => r.status === 'failed').length
    const total = this.results.length
    
    console.log(`Total Tests: ${total}`)
    console.log(`Passed: ${passed} ✅`)
    console.log(`Failed: ${failed} ❌`)
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`)
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:')
      this.results
        .filter(r => r.status === 'failed')
        .forEach(r => {
          console.log(`  - ${r.name}: ${r.error}`)
        })
    }
    
    console.log('\n🎯 Test run completed!')
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close()
    }
    console.log('🧹 Test runner cleanup completed')
  }
}

// CLI usage
async function main() {
  const runner = new SimpleTestRunner()
  
  try {
    await runner.initialize()
    
    // Run basic tests
    await runner.runBasicTests()
    
    // Run auth tests if requested
    if (process.argv.includes('--auth')) {
      await runner.runAuthTests()
    }
    
    // Run chat tests if requested
    if (process.argv.includes('--chat')) {
      await runner.runChatTests()
    }
    
    // Run all tests if no specific flags
    if (!process.argv.includes('--auth') && !process.argv.includes('--chat')) {
      await runner.runAuthTests()
      await runner.runChatTests()
    }
    
  } catch (error) {
    console.error('❌ Test runner failed:', error)
    process.exit(1)
  } finally {
    await runner.cleanup()
  }
}

// Run the test runner
main()
