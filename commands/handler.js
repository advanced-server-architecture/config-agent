/*
* @Author: Qiaosen Huang
* @Date:   2016-06-08 15:59:22
* @Last Modified by:   Qiaosen Huang
* @Last Modified time: 2016-06-08 15:59:29
*/

'use strict';

module.exports = function handleCommand(command, config) {
    const arr = command.split(' ');
    switch (arr[0]) {
        case 'restart':
            guard.restart(arr[1]);
            return true;
    }
}