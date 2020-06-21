<?php
return [
    'settings' => [
        'displayErrorDetails' => true, // set to false in production
        'addContentLengthHeader' => false, // Allow the web server to send the content-length header

        // Renderer settings
        'renderer' => [
            'template_path' => __DIR__ . '/../views/',
        ],

        // Monolog settings
        'logger' => [
            'name' => 'slim-app',
            'path' => isset($_ENV['docker']) ? 'php://stdout' : __DIR__ . '/../logs/app.log',
            'level' => \Monolog\Logger::DEBUG,
        ],

        'db' => [
            'host' => '127.0.0.1',
            'port' => '3306',
            'user' => 'root',
            'pass' => '123',
            'name' => 'weiyun_list',
            'charset' => 'utf8',
//            'option' => array(PDO::MYSQL_ATTR_INIT_COMMAND => "set character_set_connection = 'utf8'"),
        ],
    ],
];
