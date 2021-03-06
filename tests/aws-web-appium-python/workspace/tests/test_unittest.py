#
# Copyright 2016 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License").
# You may not use this file except in compliance with the License.
# A copy of the License is located at
#
# http://aws.amazon.com/apache2.0
#
# or in the "license" file accompanying this file. This file is distributed
# on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
# express or implied. See the License for the specific language governing
# permissions and limitations under the License.
#

import os
import unittest
from appium import webdriver
from time import sleep


class DeviceFarmAppiumWebTests(unittest.TestCase):

    def setUp(self):
        desired_caps = {}
        self.driver = webdriver.Remote(
            'http://127.0.0.1:4723/wd/hub', desired_caps)

    def tearDown(self):
        self.driver.quit()

    def test_devicefarm(self):

        PREFILL_NAME = 'ai_TestName'
        GAME_URL = 'https://play.smm.org/?simulateInput=true+&prefillName=AI_xoxo'

        self.driver.get(
            GAME_URL)
        sleep(5)
        screenshot_folder = os.getenv('SCREENSHOT_PATH', '/tmp')
        self.driver.save_screenshot(screenshot_folder + '/controllerScreenShot1.png')
        sleep(20)
        self.driver.get(
            'https://www.airbnb.com/')
        sleep(5)
        self.driver.get(
            GAME_URL)
        sleep(5)
        screenshot_folder = os.getenv('SCREENSHOT_PATH', '/tmp')
        self.driver.save_screenshot(screenshot_folder + '/controllerScreenShot2.png')
        sleep(20)

# Start of script
if __name__ == '__main__':
    suite = unittest.TestLoader().loadTestsFromTestCase(DeviceFarmAppiumWebTests)
    unittest.TextTestRunner(verbosity=2).run(suite)
