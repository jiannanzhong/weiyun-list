<?php

namespace ctCloud\app\mod;

use ctCloud\app\exception\InternalError;
use Medoo\Medoo;
use ctCloud\app\mod\C;

class D
{
    private static $instance = null;
    /** @var Medoo $db */
    private $db;

    private function __construct()
    {
        global $app;
        $this->db = $app->getContainer()->get('database');
    }

    public static function getInstance()
    {
        if (self::$instance === null) {
            self::$instance = new D();
        }
        return self::$instance;
    }

    /**
     * 开始事务处理.
     *
     * @param callable $cb 回调函数，将DB操作写在里面
     * @throws \Exception
     */
    public function transStart($cb)
    {
        $this->db->action($cb);
    }

    /**
     * 在transStart的$cb中调用'return transRollback();' 回滚事务
     */
    public function transRollback()
    {
        return false;
    }

    /**
     * 在transStart的$cb中调用'return transCommit();' 提交事务
     */
    public function transCommit()
    {
        return true;
    }

    public function testSql()
    {
        try {
            Medoo::raw('select 1');
        } catch (\Exception $e) {
            throw new InternalError($e->getMessage());
        }
    }

    public function getCharset()
    {
        try {
            $PDOStatement = $this->db->exec('show variables like \'character%\'');
            $all = $PDOStatement->fetchAll(\PDO::FETCH_ASSOC);
            return $all;
        } catch (\Exception $e) {
            throw new InternalError($e->getMessage());
        }
    }

    public function getUserInfoByUsername($fields, $username)
    {
        try {
            return $this->db->get(
                'user', $fields, ['username' => $username]
            );
        } catch (\Exception $e) {
            throw new InternalError($e->getMessage());
        }
    }

    public function getDirListById($fields, $id)
    {
        try {
            return $this->db->get(
                'user_directories',
                $fields,
                [
                    'id' => $id
                ]
            );
        } catch (\Exception $e) {
            throw new InternalError($e->getMessage());
        }
    }

    public function updateDirInfoById($toUpdate, $id)
    {
        try {
            $this->db->update(
                'user_directories', $toUpdate, ['id' => $id]
            );
        } catch (\Exception $e) {
            throw new InternalError($e->getMessage());
        }
    }

    public function getDirListByPid($fields, $pid, $page, $uid = null)
    {
        try {
            $where = [
                'pid' => $pid,
                'LIMIT' => [($page - 1) * C::INDEX_PAGE_SIZE, C::INDEX_PAGE_SIZE + 1],
                'ORDER' => [
                    'is_dir' => 'DESC',
                    'create_time' => 'DESC'
                ]
            ];
            if ($uid !== null) {
                $where['user_id'] = $uid;
            }
            return $this->db->select(
                'user_directories',
                $fields, $where
            );
        } catch (\Exception $e) {
            throw new InternalError($e->getMessage());
        }
    }

    public function getDirListByKeywords($fields, $keywords, $page, $uid = null)
    {
        try {
            $where = [
                'name[~]' => $keywords,
                'LIMIT' => [($page - 1) * C::INDEX_PAGE_SIZE, C::INDEX_PAGE_SIZE + 1],
                'ORDER' => [
                    'is_dir' => 'DESC',
                    'create_time' => 'DESC'
                ]
            ];
            if ($uid !== null) {
                $where['user_id'] = $uid;
            }
            return $this->db->select(
                'user_directories',
                $fields, $where
            );
        } catch (\Exception $e) {
            throw new InternalError($e->getMessage());
        }
    }

    public function getConfig($name)
    {
        try {
            $value = $this->db->get(
                'config', 'value', ['name' => $name]
            );
            if (empty($value)) {
                $value = '';
            }
            return $value;
        } catch (\Exception $e) {
            throw new InternalError($e->getMessage());
        }
    }

    public function updateConfig($value, $name)
    {
        try {
            $this->db->update('config', ['value' => $value], ['name' => $name]);
        } catch (\Exception $e) {
            throw new InternalError($e->getMessage());
        }
    }

    public function updateTagByFileId($newTag, $fileId)
    {
        try {
            $this->db->update(
                'user_directories',
                ['tag' => $newTag],
                ['id' => $fileId]
            );
        } catch (\Exception $e) {
            throw new InternalError($e->getMessage());
        }
    }

    public function log2DB($log)
    {
        try {
            $this->db->insert(
                'logs', ['log' => $log]
            );
        } catch (\Exception $e) {
            throw new InternalError($e->getMessage());
        }
    }
}