<?php

use Slim\App;
use Slim\Container;

return function (App $app) {
    $container = $app->getContainer();

    // view renderer
    $container['renderer'] = function (Container $c) {
        $settings = $c->get('settings')['renderer'];
        return new \Slim\Views\PhpRenderer($settings['template_path']);
    };

    // monolog
    $container['logger'] = function (Container $c) {
        $settings = $c->get('settings')['logger'];
        $logger = new \Monolog\Logger($settings['name']);
        $logger->pushProcessor(new \Monolog\Processor\UidProcessor());
        $logger->pushHandler(new \Monolog\Handler\StreamHandler($settings['path'], $settings['level']));
        return $logger;
    };

    // database
    $container['database'] = function (Container $c) {
        $cfg = $c->get('settings')['db'];

        return new Medoo\Medoo([
            'database_type' => 'mysql',
            'database_name' => $cfg['name'],
            'server' => $cfg['host'] . ':' . $cfg['port'],
            'username' => $cfg['user'],
            'password' => $cfg['pass'],
            'option' => array(
                \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
            ),
        ]);
    };
};
