<?php

namespace ctCloud\app\common;

use ctCloud\app\exception\EmptyReqException;
use ctCloud\app\exception\ReqParamMandatoryException;

class ParamChecker
{
    public static function checkArrayKeyExist($keys, array $arr)
    {
        if (empty($arr)) {
            throw new EmptyReqException();
        }

        if (is_array($keys)) {
            foreach ($keys as $key) {
                if (!array_key_exists($key, $arr) || strlen($arr[$key]) === 0) {
                    throw new ReqParamMandatoryException($key);
                }
            }
        } else if (is_string($keys)) {
            if (!array_key_exists($keys, $arr) || strlen($arr[$keys]) === 0) {
                throw new ReqParamMandatoryException($keys);
            }
        }
    }
}